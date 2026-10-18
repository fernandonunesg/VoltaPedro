import { pgTable, uuid, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  eventDate: text("event_date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:mm
  location: text("location").notNull().default(""),
  organizerName: text("organizer_name").notNull().default("Anônimo"),
  organizerToken: text("organizer_token"), // token secreto do organizador
  status: text("status").notNull().default("open"), // open | closed
  actualSlotIndex: integer("actual_slot_index"), // null until revealed (legado: 0..8 timed, 9 = no-show)
  actualSlotMinutes: integer("actual_slot_minutes"), // null until revealed (0..480 timed, 999 = no-show)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    voterName: text("voter_name").notNull(),
    voterToken: text("voter_token").notNull(),
    slotIndex: integer("slot_index").notNull(), // 0..8 timed, 9 = no-show
    slotMinutes: integer("slot_minutes").notNull(), // 0,30,...,240, 999
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("votes_event_token_unique").on(t.eventId, t.voterToken)]
);

export type EventRow = typeof events.$inferSelect;
export type VoteRow = typeof votes.$inferSelect;
