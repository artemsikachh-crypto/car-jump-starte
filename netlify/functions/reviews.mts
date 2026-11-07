// Відгуки покупців: GET — список, POST — новий відгук (зберігається в Netlify Database)
import { desc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { reviews } from '../../db/schema.js'

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

// Сповіщення про новий відгук у Telegram (якщо бот налаштований)
async function notifyTelegram(r: { name: string; city: string; rating: number; text: string }) {
  const token = Netlify.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Netlify.env.get('TELEGRAM_CHAT_ID')
  if (!token || !chatId) return
  const text =
    `💬 <b>Новий відгук</b>\n\n` +
    `${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}\n` +
    `👤 <b>${escapeHtml(r.name)}</b>${r.city ? `, ${escapeHtml(r.city)}` : ''}\n\n` +
    escapeHtml(r.text)
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.error('Telegram error', e)
  }
}

export default async (req: Request) => {
  if (req.method === 'GET') {
    const rows = await db
      .select({ name: reviews.name, city: reviews.city, rating: reviews.rating, text: reviews.text, createdAt: reviews.createdAt })
      .from(reviews)
      .orderBy(desc(reviews.createdAt))
      .limit(50)
    return Response.json(rows)
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let data: Record<string, unknown>
  try {
    data = await req.json()
  } catch {
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  if (data.website) return Response.json({ ok: true }) // honeypot — бот
  const name = String(data.name ?? '').trim().slice(0, 60)
  const city = String(data.city ?? '').trim().slice(0, 60)
  const text = String(data.text ?? '').trim().slice(0, 1000)
  const rating = Number(data.rating)
  if (name.length < 2 || text.length < 5 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 })
  }

  const [review] = await db
    .insert(reviews)
    .values({ name, city, rating, text })
    .returning({ name: reviews.name, city: reviews.city, rating: reviews.rating, text: reviews.text, createdAt: reviews.createdAt })
  await notifyTelegram(review)
  return Response.json({ ok: true, review }, { status: 201 })
}

export const config = { path: '/api/reviews' }
