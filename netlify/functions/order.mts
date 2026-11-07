// Приймає заявку з форми та пересилає її в Telegram-бот
const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const token = Netlify.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Netlify.env.get('TELEGRAM_CHAT_ID')
  if (!token || !chatId) {
    console.error('TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID не налаштовані')
    // Заявка все одно потрапляє в Google-таблицю, тож не показуємо клієнту помилку
    return Response.json({ ok: true, telegram: 'not_configured' })
  }

  let data: Record<string, unknown>
  try {
    data = await req.json()
  } catch {
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const name = String(data.name ?? '').trim().slice(0, 100)
  const phone = String(data.phone ?? '').trim().slice(0, 30)
  const website = String(data.website ?? '')
  if (website) return Response.json({ ok: true }) // honeypot — бот
  if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 })
  }

  const time = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })
  const text =
    `🛒 <b>Нова заявка!</b>\n\n` +
    `📦 Пусковий пристрій 965A з компресором\n` +
    `💰 Ціна: <b>2499 грн</b>\n` +
    `👤 Ім’я: <b>${escapeHtml(name)}</b>\n` +
    `📞 Телефон: <b>${escapeHtml(phone)}</b>\n` +
    `🕒 ${time}`

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })

  if (!tg.ok) {
    // Заявка вже збережена в Google-таблиці — клієнту не показуємо помилку, лише логуємо
    console.error('Telegram error', tg.status, await tg.text())
    return Response.json({ ok: true, telegram: 'failed' })
  }
  return Response.json({ ok: true })
}

export const config = { path: '/api/order' }
