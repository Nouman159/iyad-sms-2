import {
  users,
  forms,
  formResponses,
  userSessions,
  events,
  eventAttendees,
  studentsDB,
  type User,
  type UpsertUser,
  type InsertForm,
  type Form,
  type InsertFormResponse,
  type FormResponse,
  type InsertEvent,
  type Event,
  type InsertEventAttendee,
  type EventAttendee,
  type InsertStudent,
  type Student,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Forms operations
  createForm(form: InsertForm): Promise<Form>;
  getFormsByUser(userId: string): Promise<Form[]>;
  getForm(id: string): Promise<Form | undefined>;
  getFormById(id: string): Promise<Form | undefined>;
  getFormByUrl(url: string): Promise<Form | undefined>;
  updateForm(id: string, updates: Partial<InsertForm>): Promise<Form>;
  deleteForm(id: string): Promise<void>;
  
  // Form responses operations
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;
  getFormResponses(formId: string): Promise<FormResponse[]>;
  
  // User session operations
  updateUserSession(userId: string, recentApps: string[]): Promise<void>;
  getUserSession(userId: string): Promise<{ recentApps: string[] } | undefined>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserStatus(id: string, isActive: boolean): Promise<User>;
  
  
  // Bulk operations for CSV import
  bulkImportQuestions(formId: string, questions: any[]): Promise<Form>;
  bulkCreateRespondents(respondents: any[]): Promise<any[]>;
  
  // Events operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEventsByUser(userId: string): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  getAllEvents(): Promise<Event[]>;
  
  // Event attendees operations
  addEventAttendee(attendee: InsertEventAttendee): Promise<EventAttendee>;
  getEventAttendees(eventId: string): Promise<EventAttendee[]>;
  updateAttendeeStatus(eventId: string, attendeeId: string, status: string): Promise<EventAttendee>;
  removeEventAttendee(eventId: string, attendeeId: string): Promise<void>;
  
  // Student operations
  createStudent(student: InsertStudent): Promise<Student>;
  getAllStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByStudentId(studentBC: string): Promise<Student | undefined>;
  updateStudent(id: string, updates: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;
  bulkCreateStudents(students: InsertStudent[]): Promise<Student[]>;
  searchStudents(searchTerm: string): Promise<Student[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user already exists by ID (OIDC sub)
    if (userData.id) {
      const existingUserById = await this.getUser(userData.id);
      if (existingUserById) {
        // User exists with this ID, update their info (except ID)
        const { id, ...updateData } = userData;
        const [user] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user as User;
      }
    }

    // Check if user exists by email
    if (userData.email) {
      const [existingUserByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUserByEmail) {
        // User exists with this email, update their info (but keep original ID)
        const { id, ...updateData } = userData;
        const [user] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user as User;
      }
    }

    // User doesn't exist, create new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user as User;
  }

  // Forms operations
  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db.insert(forms).values(form).returning();
    return newForm as Form;
  }

  async getFormsByUser(userId: string): Promise<Form[]> {
    const result = await db
      .select()
      .from(forms)
      .where(eq(forms.createdBy, userId))
      .orderBy(desc(forms.updatedAt));
    return result as Form[];
  }

  async getForm(id: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form as Form | undefined;
  }

  async getFormById(id: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form as Form | undefined;
  }

  async getFormByUrl(url: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.formUrl, url));
    return form as Form | undefined;
  }

  async updateForm(id: string, updates: Partial<InsertForm>): Promise<Form> {
    const [updatedForm] = await db
      .update(forms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return updatedForm as Form;
  }

  async deleteForm(id: string): Promise<void> {
    await db.delete(forms).where(eq(forms.id, id));
  }

  // Form responses operations
  async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
    const [newResponse] = await db.insert(formResponses).values(response).returning();
    return newResponse as FormResponse;
  }

  async getFormResponses(formId: string): Promise<FormResponse[]> {
    const result = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt));
    return result as FormResponse[];
  }

  // User session operations
  async updateUserSession(userId: string, recentApps: string[]): Promise<void> {
    await db
      .insert(userSessions)
      .values({
        userId,
        recentApps: recentApps as any,
        lastAccessed: new Date(),
      })
      .onConflictDoUpdate({
        target: userSessions.userId,
        set: {
          recentApps: recentApps as any,
          lastAccessed: new Date(),
        },
      });
  }

  async getUserSession(userId: string): Promise<{ recentApps: string[] } | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId));
    
    if (session) {
      let recentApps: string[] = [];
      if (Array.isArray(session.recentApps)) {
        recentApps = session.recentApps as string[];
      } else if (typeof session.recentApps === 'string') {
        try {
          recentApps = JSON.parse(session.recentApps);
        } catch {
          recentApps = [];
        }
      }
      
      return { recentApps };
    }
    return undefined;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.email);
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }


  // Bulk operations for CSV import
  async bulkImportQuestions(formId: string, questions: any[]): Promise<Form> {
    // Get the existing form
    const existingForm = await this.getFormById(formId);
    if (!existingForm) {
      throw new Error('Form not found');
    }

    // Merge imported questions with existing ones
    const existingQuestions = (existingForm.questions as any[]) || [];
    const updatedQuestions = [...existingQuestions, ...questions];

    // Update the form with new questions
    const updatedForm = await this.updateForm(formId, {
      questions: updatedQuestions
    });

    return updatedForm;
  }

  async bulkCreateRespondents(respondents: any[]): Promise<any[]> {
    // For now, just return the respondents as this would typically involve
    // creating user accounts or managing a separate respondents table
    // This is a placeholder implementation
    return respondents.map(respondent => ({
      ...respondent,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    }));
  }

  // Events operations
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent as Event;
  }

  async getEventsByUser(userId: string): Promise<Event[]> {
    const result = await db
      .select()
      .from(events)
      .where(eq(events.createdBy, userId))
      .orderBy(desc(events.startDateTime));
    return result as Event[];
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event as Event | undefined;
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent as Event;
  }

  async deleteEvent(id: string): Promise<void> {
    // First delete all attendees
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, id));
    // Then delete the event
    await db.delete(events).where(eq(events.id, id));
  }

  async getAllEvents(): Promise<Event[]> {
    const result = await db
      .select()
      .from(events)
      .orderBy(desc(events.startDateTime));
    return result as Event[];
  }

  // Event attendees operations
  async addEventAttendee(attendee: InsertEventAttendee): Promise<EventAttendee> {
    const [newAttendee] = await db.insert(eventAttendees).values(attendee).returning();
    return newAttendee as EventAttendee;
  }

  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    const result = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
      .orderBy(desc(eventAttendees.registeredAt));
    return result as EventAttendee[];
  }

  async updateAttendeeStatus(eventId: string, attendeeId: string, status: string): Promise<EventAttendee> {
    const [updatedAttendee] = await db
      .update(eventAttendees)
      .set({ 
        registrationStatus: status,
        attendedAt: status === 'attended' ? new Date() : null
      })
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.attendeeId, attendeeId)))
      .returning();
    return updatedAttendee as EventAttendee;
  }

  async removeEventAttendee(eventId: string, attendeeId: string): Promise<void> {
    await db.delete(eventAttendees).where(
      and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.attendeeId, attendeeId))
    );
  }

  // Student operations
  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(studentsDB).values(student).returning();
    return newStudent as Student;
  }

  async getAllStudents(): Promise<Student[]> {
    const result = await db
      .select()
      .from(studentsDB)
      .orderBy(desc(studentsDB.createdAt));
    return result as Student[];
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(studentsDB).where(eq(studentsDB.id, id));
    return student as Student | undefined;
  }

  async getStudentByStudentId(studentBC: string): Promise<Student | undefined> {
    const [student] = await db.select().from(studentsDB).where(eq(studentsDB.student_BC, studentBC));
    return student as Student | undefined;
  }

  async updateStudent(id: string, updates: Partial<InsertStudent>): Promise<Student> {
    const [updatedStudent] = await db
      .update(studentsDB)
      .set(updates)
      .where(eq(studentsDB.id, id))
      .returning();
    return updatedStudent as Student;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(studentsDB).where(eq(studentsDB.id, id));
  }

  async bulkCreateStudents(studentData: InsertStudent[]): Promise<Student[]> {
    if (studentData.length === 0) return [];
    
    const results: Student[] = [];
    
    for (const student of studentData) {
      try {
        // Check if student already exists by BC No (student_BC)
        const existingStudent = await this.getStudentByStudentId(student.student_BC!);
        
        if (existingStudent) {
          // Update existing student - uploaded file takes priority
          const updatedStudent = await this.updateStudent(existingStudent.id, student);
          results.push(updatedStudent);
        } else {
          // Create new student
          const newStudent = await this.createStudent(student);
          results.push(newStudent);
        }
      } catch (error) {
        console.error(`Error processing student ${student.student_BC}:`, error);
        // Continue with other students instead of failing the entire batch
      }
    }
    
    return results;
  }

  async searchStudents(searchTerm: string): Promise<Student[]> {
    const searchPattern = `%${searchTerm}%`;
    const result = await db
      .select()
      .from(studentsDB)
      .where(
        and(
          eq(studentsDB.status, 'active'),
          or(
            like(studentsDB.fullName, searchPattern),
            like(studentsDB.student_BC, searchPattern),
            like(studentsDB.level, searchPattern),
            like(studentsDB.class, searchPattern)
          )
        )
      )
      .orderBy(desc(studentsDB.createdAt));
    return result as Student[];
  }
}

export const storage = new DatabaseStorage();
