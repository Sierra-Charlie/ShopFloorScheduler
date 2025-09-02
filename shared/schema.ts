import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(), // "production_supervisor", "assembler", "material_handler", "scheduler", "admin"
  email: text("email").notNull().unique(),
});

export const assemblers = pgTable("assemblers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "mechanical", "electrical", "final", "qc"
  status: text("status").notNull().default("available"), // "available", "busy", "offline"
  assignedUser: varchar("assigned_user").references(() => users.id), // User assigned to operate this assembler
});

export const assemblyCards = pgTable("assembly_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardNumber: text("card_number").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "M", "E", "S", "P", "KB", "DEAD_TIME"
  duration: integer("duration").notNull(), // in hours
  phase: integer("phase").notNull(), // 1, 2, 3, 4
  assignedTo: varchar("assigned_to").references(() => assemblers.id),
  status: text("status").notNull().default("scheduled"), // "scheduled", "in_progress", "assembling", "completed", "blocked", "ready_for_build", "paused", "picking"
  dependencies: text("dependencies").array().notNull().default([]), // array of card numbers that must be completed first
  precedents: text("precedents").array().notNull().default([]), // array of card numbers that depend on this one
  gembaDocLink: text("gemba_doc_link"), // URL link to Gemba documentation for work instructions
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  elapsedTime: integer("elapsed_time").default(0), // accumulated elapsed seconds when paused
  pickingStartTime: timestamp("picking_start_time"), // when picking started
  actualDuration: real("actual_duration"), // actual time taken in hours when completed
  position: integer("position").default(0), // horizontal position in timeline
  grounded: boolean("grounded").default(false), // true if card is locked in place and cannot be moved
  subAssyArea: integer("sub_assy_area"), // SUB ASSY AREA 1-6 assignment for S and P type cards
});

export const andonIssues = pgTable("andon_issues", {
  id: serial("id").primaryKey(),
  issueNumber: varchar("issue_number").notNull().unique(), // Auto-generated issue number like "AI-001"
  assemblyCardNumber: text("assembly_card_number").notNull(),
  description: text("description").notNull(),
  photoPath: text("photo_path"), // Path to photo in object storage
  submittedBy: text("submitted_by").notNull(), // Name of assembler who submitted
  assignedTo: varchar("assigned_to").references(() => users.id), // Assigned user for resolution
  status: text("status").notNull().default("unresolved"), // "unresolved", "being_worked_on", "resolved"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertAssemblerSchema = createInsertSchema(assemblers).omit({
  id: true,
});

export const insertAssemblyCardSchema = createInsertSchema(assemblyCards).omit({
  id: true,
});

export const updateAssemblyCardSchema = z.object({
  id: z.string(),
  cardNumber: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(["M", "E", "S", "P", "KB", "DEAD_TIME"]).optional(),
  duration: z.number().min(1).optional(),
  phase: z.number().min(1).max(4).optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(["scheduled", "in_progress", "assembling", "completed", "blocked", "ready_for_build", "paused", "picking"]).optional(),
  dependencies: z.array(z.string()).optional(),
  precedents: z.array(z.string()).optional(),
  gembaDocLink: z.string().url().nullable().optional(),
  startTime: z.date().nullable().optional(),
  endTime: z.date().nullable().optional(),
  elapsedTime: z.number().optional(),
  pickingStartTime: z.date().nullable().optional(),
  actualDuration: z.number().optional(),
  position: z.number().nullable().optional(),
  grounded: z.boolean().optional(),
  subAssyArea: z.number().min(1).max(6).nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAssembler = z.infer<typeof insertAssemblerSchema>;
export type Assembler = typeof assemblers.$inferSelect;

export const insertAndonIssueSchema = createInsertSchema(andonIssues).omit({
  id: true,
  issueNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const updateAndonIssueSchema = z.object({
  id: z.number(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(["unresolved", "being_worked_on", "resolved"]).optional(),
});

export type InsertAssemblyCard = z.infer<typeof insertAssemblyCardSchema>;
export type AssemblyCard = typeof assemblyCards.$inferSelect;
export type UpdateAssemblyCard = z.infer<typeof updateAssemblyCardSchema>;

export type InsertAndonIssue = z.infer<typeof insertAndonIssueSchema>;
export type AndonIssue = typeof andonIssues.$inferSelect;
export type UpdateAndonIssue = z.infer<typeof updateAndonIssueSchema>;

// Messaging System Tables

export const messageThreads = pgTable("message_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category").notNull(), // "kaizen", "safety", "efficiency", "quality", "general"
  tags: text("tags").array().notNull().default([]), // Array of tags for better organization
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(), // For archiving threads
  upvotes: integer("upvotes").default(0).notNull(), // Community voting for great ideas
  implementationStatus: text("implementation_status").default("idea").notNull(), // "idea", "evaluating", "implementing", "completed", "rejected"
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").references(() => messageThreads.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  attachmentPath: text("attachment_path"), // Path to file in object storage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
});

export const threadVotes = pgTable("thread_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").references(() => messageThreads.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  voteType: text("vote_type").notNull(), // "upvote", "downvote"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const threadParticipants = pgTable("thread_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").references(() => messageThreads.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  canWrite: boolean("can_write").default(true).notNull(), // Granular permission control
});

// Schema validation for messaging
export const insertThreadSchema = createInsertSchema(messageThreads).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
  upvotes: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
});

export const updateThreadSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  implementationStatus: z.enum(["idea", "evaluating", "implementing", "completed", "rejected"]).optional(),
  isActive: z.boolean().optional(),
});

export const insertVoteSchema = createInsertSchema(threadVotes).omit({
  id: true,
  createdAt: true,
});

// Types for messaging system
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type MessageThread = typeof messageThreads.$inferSelect;
export type UpdateThread = z.infer<typeof updateThreadSchema>;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type ThreadVote = typeof threadVotes.$inferSelect;

export type ThreadParticipant = typeof threadParticipants.$inferSelect;
