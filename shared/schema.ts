import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(), // "production_supervisor", "assembler", "material_handler", "scheduler", "admin", "engineer"
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assemblers = pgTable("assemblers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "mechanical", "electrical", "final", "qc"
  status: text("status").notNull().default("available"), // "available", "busy", "offline"
  assignedUser: varchar("assigned_user").references(() => users.id), // User assigned to operate this assembler
  machineType: text("machine_type"), // "Turbo 505", "Voyager", "Champ"
  machineNumber: text("machine_number"), // 4-digit machine number
});

export const assemblyCards = pgTable("assembly_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardNumber: text("card_number").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "M", "E", "S", "P", "KB", "DEAD_TIME", "D"
  duration: integer("duration").notNull(), // in hours
  phase: integer("phase").notNull(), // 1, 2, 3, 4
  assignedTo: varchar("assigned_to").references(() => assemblers.id),
  assignedMaterialHandler: varchar("assigned_material_handler").references(() => users.id), // Material handler assigned to pick this card
  status: text("status").notNull().default("scheduled"), // "scheduled", "cleared_for_picking", "in_progress", "assembling", "completed", "blocked", "ready_for_build", "paused", "picking", "delivered_to_paint"
  dependencies: text("dependencies").array().notNull().default([]), // array of card numbers that must be completed first
  gembaDocLink: text("gemba_doc_link"), // URL link to Gemba documentation for work instructions
  pickListLink: text("pick_list_link"), // URL link to pick list in external system
  materialSeq: text("material_seq"), // Material sequence information - free form text
  assemblySeq: text("assembly_seq"), // Assembly sequence information - free form text
  operationSeq: text("operation_seq"), // Operation sequence information - free form text
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  elapsedTime: integer("elapsed_time").default(0), // accumulated elapsed seconds when paused
  pickingStartTime: timestamp("picking_start_time"), // when picking started
  actualDuration: real("actual_duration"), // actual time taken in hours when completed
  position: real("position").default(0), // horizontal position in timeline
  grounded: boolean("grounded").default(false), // true if card is locked in place and cannot be moved
  subAssyArea: integer("sub_assy_area"), // SUB ASSY AREA 1-6 assignment for S and P type cards
  requiresCrane: boolean("requires_crane").default(false), // true if assembly requires crane assistance
  priority: text("priority").default("B"), // A, B, C priority for scheduling within delivery phases
  pickTime: integer("pick_time"), // time required to pick materials in minutes (15-180)
  pickDueDate: timestamp("pick_due_date"), // due date for when materials should be picked
  phaseClearedToBuildDate: timestamp("phase_cleared_to_build_date"), // earliest scheduled date for any card in this phase
});

export const andonIssues = pgTable("andon_issues", {
  id: serial("id").primaryKey(),
  issueNumber: varchar("issue_number").notNull().unique(), // Auto-generated issue number like "AI-001"
  assemblyCardNumber: text("assembly_card_number").notNull(),
  issueType: text("issue_type").notNull(), // Type of issue for categorization
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "critical"
  reporterName: text("reporter_name").notNull(), // Name of person who reported the issue
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
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email().refine(
    (email) => email.endsWith('@vikingeng.com') || email.endsWith('@stonetreeinvest.com'),
    { message: 'Email must be from @vikingeng.com or @stonetreeinvest.com domain' }
  ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email().refine(
    (email) => email.endsWith('@vikingeng.com') || email.endsWith('@stonetreeinvest.com'),
    { message: 'Email must be from @vikingeng.com or @stonetreeinvest.com domain' }
  ),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().refine(
    (email) => email.endsWith('@vikingeng.com') || email.endsWith('@stonetreeinvest.com'),
    { message: 'Email must be from @vikingeng.com or @stonetreeinvest.com domain' }
  ).optional(),
  role: z.enum(["production_supervisor", "assembler", "material_handler", "scheduler", "admin", "engineer"]).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const insertAssemblerSchema = createInsertSchema(assemblers).omit({
  id: true,
}).extend({
  machineType: z.enum(["Turbo 505", "Voyager", "Champ"]).nullable().optional(),
  machineNumber: z.string().length(4, "Machine number must be exactly 4 digits").regex(/^\d{4}$/, "Machine number must contain only digits").nullable().optional(),
});

export const insertAssemblyCardSchema = createInsertSchema(assemblyCards).omit({
  id: true,
}).extend({
  assignedTo: z.string().nullable().optional().transform(val => val === '' ? null : val),
  assignedMaterialHandler: z.string().nullable().optional().transform(val => val === '' ? null : val),
});

export const updateAssemblerSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.enum(["mechanical", "electrical", "final", "qc"]).optional(),
  status: z.enum(["available", "busy", "offline"]).optional(),
  assignedUser: z.string().nullable().optional(),
  machineType: z.enum(["Turbo 505", "Voyager", "Champ"]).nullable().optional(),
  machineNumber: z.string().length(4, "Machine number must be exactly 4 digits").regex(/^\d{4}$/, "Machine number must contain only digits").nullable().optional(),
});

export const updateAssemblyCardSchema = z.object({
  id: z.string(),
  cardNumber: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(["M", "E", "S", "P", "KB", "DEAD_TIME", "D"]).optional(),
  duration: z.number().min(1).optional(),
  phase: z.number().min(1).max(4).optional(),
  assignedTo: z.string().nullable().optional(),
  assignedMaterialHandler: z.string().nullable().optional(),
  status: z.enum(["scheduled", "cleared_for_picking", "in_progress", "assembling", "completed", "blocked", "ready_for_build", "paused", "picking", "delivered_to_paint"]).optional(),
  dependencies: z.array(z.string()).optional(),
  gembaDocLink: z.string().url().nullable().optional(),
  pickListLink: z.string().nullable().optional(),
  materialSeq: z.string().nullable().optional(),
  assemblySeq: z.string().nullable().optional(),
  operationSeq: z.string().nullable().optional(),
  startTime: z.date().nullable().optional(),
  endTime: z.date().nullable().optional(),
  elapsedTime: z.number().optional(),
  pickingStartTime: z.date().nullable().optional(),
  actualDuration: z.number().optional(),
  position: z.number().nullable().optional(),
  grounded: z.boolean().optional(),
  subAssyArea: z.number().min(1).max(6).nullable().optional(),
  requiresCrane: z.boolean().optional(),
  priority: z.enum(["A", "B", "C"]).optional(),
  pickTime: z.number().nullable().optional(),
  pickDueDate: z.date().nullable().optional(),
  phaseClearedToBuildDate: z.date().nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginUser = z.infer<typeof loginSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type InsertAssembler = z.infer<typeof insertAssemblerSchema>;
export type Assembler = typeof assemblers.$inferSelect;
export type UpdateAssembler = z.infer<typeof updateAssemblerSchema>;

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

// SMS Settings Table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
export type UpdateSetting = z.infer<typeof updateSettingSchema>;

// File Upload Schema for CSV/Excel import
export const fileUploadSchema = z.object({
  cardNumber: z.string(),
  name: z.string(),
  type: z.enum(["M", "E", "S", "P", "KB", "DEAD_TIME", "D"]),
  duration: z.number().min(1),
  phase: z.number().min(1).max(4),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(["scheduled", "cleared_for_picking", "in_progress", "assembling", "completed", "blocked", "ready_for_build", "paused", "picking", "delivered_to_paint"]).default("scheduled"),
  dependencies: z.array(z.string()).default([]),
  gembaDocLink: z.string().url().nullable().optional(),
  materialSeq: z.string().nullable().optional(),
  operationSeq: z.string().nullable().optional(),
  subAssyArea: z.number().min(1).max(6).nullable().optional(),
  requiresCrane: z.boolean().default(false),
  priority: z.enum(["A", "B", "C"]).default("B"),
});

export type FileUploadData = z.infer<typeof fileUploadSchema>;
