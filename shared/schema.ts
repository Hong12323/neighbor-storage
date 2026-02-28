import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url"),
  balance: integer("balance").notNull().default(0),
  trustScore: doublePrecision("trust_score").notNull().default(36.5),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  isShopOwner: boolean("is_shop_owner").notNull().default(false),
  shopName: text("shop_name"),
  location: text("location").default("오전동"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  pricePerDay: integer("price_per_day").notNull(),
  deposit: integer("deposit").notNull().default(0),
  isProItem: boolean("is_pro_item").notNull().default(false),
  canTeach: boolean("can_teach").notNull().default(false),
  canDeliver: boolean("can_deliver").notNull().default(false),
  images: text("images").array().notNull().default(sql`'{}'::text[]`),
  description: text("description").notNull().default(""),
  location: text("location").default("오전동"),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  rating: doublePrecision("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rentals = pgTable("rentals", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  borrowerId: varchar("borrower_id")
    .notNull()
    .references(() => users.id),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("requested"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalFee: integer("total_fee").notNull(),
  depositHeld: integer("deposit_held").notNull().default(0),
  isDelivery: boolean("is_delivery").notNull().default(false),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  relatedRentalId: integer("related_rental_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  rentalId: integer("rental_id").references(() => rentals.id),
  reviewerId: varchar("reviewer_id")
    .notNull()
    .references(() => users.id),
  targetId: varchar("target_id").references(() => users.id),
  itemId: integer("item_id").references(() => items.id),
  score: integer("score").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  user1Id: varchar("user1_id")
    .notNull()
    .references(() => users.id),
  user2Id: varchar("user2_id")
    .notNull()
    .references(() => users.id),
  itemId: integer("item_id").references(() => items.id),
  lastMessage: text("last_message").default(""),
  lastMessageTime: timestamp("last_message_time").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => chatRooms.id),
  senderId: varchar("sender_id").notNull(),
  text: text("text").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  nickname: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  nickname: z.string().min(1),
  password: z.string().min(6),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Item = typeof items.$inferSelect;
export type Rental = typeof rentals.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
