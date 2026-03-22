import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pptJobsTable = pgTable("ppt_jobs", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  language: text("language").notNull().default("zh"),
  slideCount: integer("slide_count").notNull().default(10),
  style: text("style").notNull().default("professional"),
  audience: text("audience"),
  additionalRequirements: text("additional_requirements"),
  useAgentSkills: integer("use_agent_skills").notNull().default(1),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  currentStep: text("current_step"),
  outline: jsonb("outline"),
  filePath: text("file_path"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertPptJobSchema = createInsertSchema(pptJobsTable).omit({
  createdAt: true,
  completedAt: true,
});

export type InsertPptJob = z.infer<typeof insertPptJobSchema>;
export type PptJob = typeof pptJobsTable.$inferSelect;
