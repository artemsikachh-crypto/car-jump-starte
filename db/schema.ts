import { pgTable, serial, text, timestamp, smallint } from "drizzle-orm/pg-core";

export const reviews = pgTable("reviews", {
  id: serial().primaryKey(),
  name: text().notNull(),
  city: text().notNull().default(""),
  rating: smallint().notNull(),
  text: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
