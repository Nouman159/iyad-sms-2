import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  department: varchar("department"),
  userType: varchar("user_type").notNull().default("HOD"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  formType: varchar("form_type").notNull().default("survey"),
  formUrl: varchar("form_url").unique(),
  status: varchar("status").notNull().default("draft"), // draft, active, inactive
  createdBy: varchar("created_by").notNull().references(() => users.id),
  settings: jsonb("settings"),
  questions: jsonb("questions"), // Working draft content
  sections: jsonb("sections"), // Working draft content
  previewQuestions: jsonb("preview_questions"), // Preview content (saved)
  previewSections: jsonb("preview_sections"), // Preview content (saved)
  publishedQuestions: jsonb("published_questions"), // Published content (live)
  publishedSections: jsonb("published_sections"), // Published content (live)
  lastSavedAt: timestamp("last_saved_at"), // When preview was last updated
  lastPublishedAt: timestamp("last_published_at"), // When published was last updated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formResponses = pgTable("form_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id),
  respondentId: varchar("respondent_id"),
  responses: jsonb("responses").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  lastAccessed: timestamp("last_accessed").defaultNow(),
  recentApps: jsonb("recent_apps"),
});

// Schema exports
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectFormSchema = createSelectSchema(forms);

export const insertFormResponseSchema = createInsertSchema(formResponses).omit({
  id: true,
  submittedAt: true,
});

export const selectFormResponseSchema = createSelectSchema(formResponses);


// Events table for event management
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  eventType: varchar("event_type").notNull(), // meeting, conference, workshop, seminar, social, etc.
  location: varchar("location"),
  capacity: integer("capacity"),
  status: varchar("status").notNull().default("upcoming"), // upcoming, ongoing, completed, cancelled
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  settings: jsonb("settings"), // Additional event configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event attendees table for tracking attendance
export const eventAttendees = pgTable("event_attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  attendeeId: varchar("attendee_id").notNull().references(() => users.id),
  registrationStatus: varchar("registration_status").notNull().default("registered"), // registered, confirmed, attended, absent
  attendedAt: timestamp("attended_at"),
  registeredAt: timestamp("registered_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  capacity: z.coerce.number().optional(),
});

export const selectEventSchema = createSelectSchema(events);

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  registeredAt: true,
});

export const selectEventAttendeeSchema = createSelectSchema(eventAttendees);

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = z.infer<typeof selectFormSchema>;
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = z.infer<typeof selectFormResponseSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = z.infer<typeof selectEventSchema>;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type EventAttendee = z.infer<typeof selectEventAttendeeSchema>;

// Students table for student database management
export const studentsDB = pgTable("studentsDB", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  student_BC: varchar("student_BC").unique(), // Student BC/Number from import
  fullName: varchar("full_name"), // Combined name if provided as single field
  dateOfBirth: varchar("date_of_birth"), // Keep as varchar for flexible date formats
  gender: varchar("gender"),
  level: varchar("level"),
  class: varchar("class"),
  centre: varchar("centre"),
  guardianName: varchar("guardian_name"),
  guardianEmail: varchar("guardian_email"),
  guardianPhone: varchar("guardian_phone"),
  address: text("address"),
  emergencyContact: varchar("emergency_contact"),
  emergencyPhone: varchar("emergency_phone"),
  medicalInfo: text("medical_info"),
  status: varchar("status").notNull().default("active"), // active, inactive, transferred, graduated
  additionalData: jsonb("additional_data"), // Flexible storage for extra fields from Excel import
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsDB).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectStudentSchema = createSelectSchema(studentsDB);

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = z.infer<typeof selectStudentSchema>;
