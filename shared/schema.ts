import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
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
  type: text("type").notNull(), // "M", "E", "S", "P", "KB"
  duration: integer("duration").notNull(), // in hours
  phase: integer("phase").notNull(), // 1, 2, 3, 4
  assignedTo: varchar("assigned_to").references(() => assemblers.id),
  status: text("status").notNull().default("scheduled"), // "scheduled", "in_progress", "assembling", "completed", "blocked", "ready_for_build"
  dependencies: text("dependencies").array().notNull().default([]), // array of card numbers that must be completed first
  precedents: text("precedents").array().notNull().default([]), // array of card numbers that depend on this one
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  position: integer("position").default(0), // horizontal position in timeline
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
  type: z.enum(["M", "E", "S", "P", "KB"]).optional(),
  duration: z.number().min(1).optional(),
  phase: z.number().min(1).max(4).optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(["scheduled", "in_progress", "assembling", "completed", "blocked", "ready_for_build"]).optional(),
  dependencies: z.array(z.string()).optional(),
  precedents: z.array(z.string()).optional(),
  startTime: z.date().nullable().optional(),
  endTime: z.date().nullable().optional(),
  position: z.number().nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAssembler = z.infer<typeof insertAssemblerSchema>;
export type Assembler = typeof assemblers.$inferSelect;

export type InsertAssemblyCard = z.infer<typeof insertAssemblyCardSchema>;
export type AssemblyCard = typeof assemblyCards.$inferSelect;
export type UpdateAssemblyCard = z.infer<typeof updateAssemblyCardSchema>;
