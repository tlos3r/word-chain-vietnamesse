import { boolean, pgTable, serial, smallint, text, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const players = pgTable("players", {
    id: serial("id").primaryKey(),
    userId: varchar("userId"),
    name: varchar("name", { length: 20 }),
    roomId: varchar("roomId", { length: 5 }),
});

export const playersRelations = relations(players, ({ one }) => ({
    room: one(rooms, {
        fields: [players.roomId],
        references: [rooms.id],
    }),
}));

export const rooms = pgTable("rooms", {
    id: varchar("id", { length: 5 }).unique().primaryKey(),
    finished: boolean("finished"),
    timeToAnswers: smallint("timeToAnswers"),
    host: varchar("host"),
    turn: smallint("turn"),
});
export const roomsRelations = relations(rooms, ({ many }) => ({
    players: many(players),
}));

export const words = pgTable("words", {
    id: serial("id").primaryKey(),
    word: varchar("word"),
});
