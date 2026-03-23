import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stickerPacksTable = pgTable("sticker_packs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stickersTable = pgTable("stickers", {
  id: serial("id").primaryKey(),
  packId: integer("pack_id").notNull(),
  imageUrl: text("image_url").notNull(),
  emoji: text("emoji"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStickerPackSchema = createInsertSchema(stickerPacksTable).omit({ id: true, createdAt: true });
export const insertStickerSchema = createInsertSchema(stickersTable).omit({ id: true, createdAt: true });
export type InsertStickerPack = z.infer<typeof insertStickerPackSchema>;
export type StickerPack = typeof stickerPacksTable.$inferSelect;
export type Sticker = typeof stickersTable.$inferSelect;
