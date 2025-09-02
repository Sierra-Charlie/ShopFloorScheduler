import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";
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
  actualDuration: integer("actual_duration"), // actual time taken in hours when completed
  position: integer("position").default(0), // horizontal position in timeline
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
