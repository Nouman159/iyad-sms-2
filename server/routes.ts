import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMicrosoftAuth } from "./microsoftAuth";
import { insertFormSchema, insertFormResponseSchema, insertEventSchema, insertEventAttendeeSchema, insertStudentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Microsoft OAuth setup
  setupMicrosoftAuth(app);

  // Custom login endpoint for form-based authentication
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Authorized users database
      const AUTHORIZED_USERS = [
        { email: 'cck@iyad.sg', name: 'CCK', dept: 'CCK', userType: 'HOD' },
        { email: 'je@iyad.sg', name: 'JE', dept: 'JE', userType: 'HOD' },
        { email: 'hg@iyad.sg', name: 'HG', dept: 'HG', userType: 'HOD' },
        { email: 'hq@iyad.sg', name: 'HQ', dept: 'HQ', userType: 'HOD' },
        { email: 'admin@iyad.sg', name: 'Admin', dept: 'Admin', userType: 'Master Admin' },
      ];
      
      // Find user
      const user = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user || password !== '1234') {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Create user in database if not exists
      const dbUser = await storage.upsertUser({
        email: user.email,
        firstName: user.name,
        lastName: user.dept,
        profileImageUrl: null,
        department: user.dept,
        userType: user.userType,
      });
      
      // Create session
      (req.session as any).user = {
        claims: {
          sub: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
        }
      };
      
      res.json({ 
        message: 'Login successful',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.firstName,
          dept: dbUser.department,
          userType: dbUser.userType
        }
      });
      
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Forms routes
  app.get('/api/forms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const forms = await storage.getFormsByUser(userId);
      
      // Map server fields to client fields for all forms
      const clientForms = forms.map(form => ({
        ...form,
        title: form.name
      }));
      res.json(clientForms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  app.post('/api/forms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Map client fields to server schema fields
      const { title, ...rest } = req.body;
      const mappedData = {
        ...rest,
        name: title, // Map title to name
        createdBy: userId
      };
      
      const formData = insertFormSchema.parse(mappedData);
      const form = await storage.createForm(formData);
      
      // Map server fields to client fields for response
      const clientForm = {
        ...form,
        title: form.name
      };
      res.json(clientForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Form validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  app.get('/api/forms/:id', isAuthenticated, async (req, res) => {
    try {
      const form = await storage.getFormById(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      // Verify ownership
      if (form.createdBy !== (req.user as any)?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied: You can only view your own forms' });
      }
      
      // Map server fields to client fields
      const clientForm = {
        ...form,
        title: form.name
      };
      res.json(clientForm);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.put('/api/forms/:id', isAuthenticated, async (req, res) => {
    try {
      // First verify the form exists and user owns it
      const existingForm = await storage.getFormById(req.params.id);
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      if (existingForm.createdBy !== (req.user as any)?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied: You can only update your own forms' });
      }
      
      // Map client fields to server schema fields and exclude createdBy to prevent ownership transfer  
      const { title, questions, sections, status, ...rest } = req.body;
      const mappedData = ('title' in req.body) ? { ...rest, name: title } : rest;
      
      // Determine operation type based on request body
      const isPublishOperation = status === 'active';
      
      if (isPublishOperation) {
        // Publish operation: Copy preview content to published content
        const updates = {
          ...mappedData,
          status: 'active',
          publishedQuestions: existingForm.previewQuestions || existingForm.questions,
          publishedSections: existingForm.previewSections || existingForm.sections,
          lastPublishedAt: new Date()
        };
        
        const form = await storage.updateForm(req.params.id, insertFormSchema.partial().omit({ createdBy: true }).parse(updates));
        
        // Map server fields to client fields for response
        const clientForm = {
          ...form,
          title: form.name
        };
        res.json(clientForm);
      } else {
        // Save operation: Update draft content (questions/sections)
        const updates = {
          ...mappedData,
          questions: questions || existingForm.questions,
          sections: sections || existingForm.sections,
          lastSavedAt: new Date()
        };
        
        const form = await storage.updateForm(req.params.id, insertFormSchema.partial().omit({ createdBy: true }).parse(updates));
        
        // Map server fields to client fields for response
        const clientForm = {
          ...form,
          title: form.name
        };
        res.json(clientForm);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      console.error("Error updating form:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.delete('/api/forms/:id', isAuthenticated, async (req, res) => {
    try {
      // First verify the form exists and user owns it
      const existingForm = await storage.getFormById(req.params.id);
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      if (existingForm.createdBy !== (req.user as any)?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied: You can only delete your own forms' });
      }
      
      await storage.deleteForm(req.params.id);
      res.json({ message: "Form deleted successfully" });
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });


  // URL checking endpoint
  app.get('/api/forms/check-url/:url', async (req, res) => {
    try {
      const { url } = req.params;
      
      // Basic validation
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          available: false, 
          message: 'URL is required' 
        });
      }

      // Check if URL contains only valid characters
      const urlPattern = /^[a-zA-Z0-9_-]+$/;
      if (!urlPattern.test(url)) {
        return res.status(400).json({ 
          available: false, 
          message: 'URL can only contain letters, numbers, underscores, and hyphens' 
        });
      }

      // Check if URL is already taken
      const existingForm = await storage.getFormByUrl(url);
      
      if (existingForm) {
        return res.json({ 
          available: false, 
          message: 'This URL is already taken. Please choose a different one.' 
        });
      }

      // URL is available
      res.json({ 
        available: true, 
        message: `URL will be: /${url}` 
      });
      
    } catch (error) {
      console.error("Error checking URL:", error);
      res.status(500).json({ 
        available: false, 
        message: "Error checking URL availability" 
      });
    }
  });

  // Public API to get form by URL (no authentication required)
  // Public form endpoint - serves published content
  app.get('/api/public/forms/:url', async (req, res) => {
    try {
      const { url } = req.params;
      
      // Get form by URL
      const form = await storage.getFormByUrl(url);
      
      if (!form) {
        return res.status(404).json({ 
          message: 'Form not found' 
        });
      }

      // Parse settings from JSON field
      const settings = form.settings ? (typeof form.settings === 'string' ? JSON.parse(form.settings) : form.settings) : {};
      
      // For published forms, use published content if available, otherwise fall back to questions/sections
      const questionsToUse = form.publishedQuestions || form.questions;
      const sectionsToUse = form.publishedSections || form.sections;
      
      // Return only public fields needed for display
      const publicForm = {
        id: form.id,
        title: form.name, // Map name to title for client
        description: form.description,
        welcomeMessage: settings.welcomeMessage || '',
        formType: form.formType,
        formUrl: form.formUrl,
        questions: questionsToUse ? (typeof questionsToUse === 'string' ? JSON.parse(questionsToUse) : questionsToUse) : [],
        sections: sectionsToUse ? (typeof sectionsToUse === 'string' ? JSON.parse(sectionsToUse) : sectionsToUse) : [],
        settings: {
          welcomeMessage: settings.welcomeMessage || '',
          iconData: settings.iconData || null,
          submissionType: settings.submissionType,
          allowEditResponse: settings.allowEditResponse,
          submissionDeadline: settings.submissionDeadline,
          liveStatus: settings.liveStatus,
        },
        submissionType: settings.submissionType,
        allowEditResponse: settings.allowEditResponse,
        submissionDeadline: settings.submissionDeadline,
        liveStatus: settings.liveStatus,
        createdAt: form.createdAt
      };

      res.json(publicForm);
    } catch (error) {
      console.error("Error fetching public form:", error);
      res.status(500).json({ 
        message: 'Failed to fetch form' 
      });
    }
  });

  // Authenticated preview endpoint - serves preview content to form owners
  app.get('/api/forms/preview/:url', isAuthenticated, async (req, res) => {
    try {
      const { url } = req.params;
      
      // Get form by URL
      const form = await storage.getFormByUrl(url);
      
      if (!form) {
        return res.status(404).json({ 
          message: 'Form not found' 
        });
      }
      
      // Verify ownership - only form owner can access preview
      if (form.createdBy !== (req.user as any)?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied: You can only preview your own forms' });
      }

      // Parse settings from JSON field
      const settings = form.settings ? (typeof form.settings === 'string' ? JSON.parse(form.settings) : form.settings) : {};
      
      // For preview forms, use preview content if available, otherwise fall back to questions/sections
      const questionsToUse = form.previewQuestions || form.questions;
      const sectionsToUse = form.previewSections || form.sections;
      
      // Return only public fields needed for display
      const previewForm = {
        id: form.id,
        title: form.name, // Map name to title for client
        description: form.description,
        welcomeMessage: settings.welcomeMessage || '',
        formType: form.formType,
        formUrl: form.formUrl,
        questions: questionsToUse ? (typeof questionsToUse === 'string' ? JSON.parse(questionsToUse) : questionsToUse) : [],
        sections: sectionsToUse ? (typeof sectionsToUse === 'string' ? JSON.parse(sectionsToUse) : sectionsToUse) : [],
        settings: {
          welcomeMessage: settings.welcomeMessage || '',
          iconData: settings.iconData || null,
          submissionType: settings.submissionType,
          allowEditResponse: settings.allowEditResponse,
          submissionDeadline: settings.submissionDeadline,
          liveStatus: settings.liveStatus,
        },
        submissionType: settings.submissionType,
        allowEditResponse: settings.allowEditResponse,
        submissionDeadline: settings.submissionDeadline,
        liveStatus: settings.liveStatus,
        createdAt: form.createdAt,
        isPreview: true // Add flag to indicate this is a preview
      };

      res.json(previewForm);
    } catch (error) {
      console.error("Error fetching preview form:", error);
      res.status(500).json({ 
        message: 'Failed to fetch preview form' 
      });
    }
  });

  // Prepare preview endpoint - copies draft content to preview fields
  app.post('/api/forms/:id/prepare-preview', isAuthenticated, async (req, res) => {
    try {
      // First verify the form exists and user owns it
      const existingForm = await storage.getFormById(req.params.id);
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      if (existingForm.createdBy !== (req.user as any)?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied: You can only preview your own forms' });
      }
      
      // Copy draft content to preview fields
      const updates = {
        previewQuestions: existingForm.questions,
        previewSections: existingForm.sections,
        lastSavedAt: new Date()
      };
      
      await storage.updateForm(req.params.id, insertFormSchema.partial().omit({ createdBy: true }).parse(updates));
      
      res.json({ message: 'Preview prepared successfully' });
    } catch (error) {
      console.error("Error preparing preview:", error);
      res.status(500).json({ message: "Failed to prepare preview" });
    }
  });

  // Form responses routes
  app.get('/api/forms/:id/responses', isAuthenticated, async (req, res) => {
    try {
      // First verify the form exists and user owns it
      const form = await storage.getFormById(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.createdBy !== (req.user as any)?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied: You can only view responses for your own forms' });
      }
      
      const responses = await storage.getFormResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching form responses:", error);
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.post('/api/forms/:id/responses', async (req, res) => {
    try {
      const responseData = insertFormResponseSchema.parse({
        ...req.body,
        formId: req.params.id,
      });
      const response = await storage.createFormResponse(responseData);
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      console.error("Error creating form response:", error);
      res.status(500).json({ message: "Failed to create form response" });
    }
  });

  // User session routes
  app.post('/api/user/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate session data with Zod
      const sessionSchema = z.object({
        recentApps: z.array(z.string()).max(5).default([])
      });
      
      const { recentApps } = sessionSchema.parse(req.body);
      await storage.updateUserSession(userId, recentApps);
      res.json({ message: "Session updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      console.error("Error updating user session:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.get('/api/user/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getUserSession(userId);
      res.json(session || { recentApps: [] });
    } catch (error) {
      console.error("Error fetching user session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.userType !== 'Master Admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.userType !== 'Master Admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const { isActive } = req.body;
      const updatedUser = await storage.updateUserStatus(req.params.id, isActive);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });


  // Bulk CSV import routes
  app.post('/api/forms/:id/questions/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const formId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify form ownership
      const form = await storage.getFormById(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (form.createdBy !== userId) {
        return res.status(403).json({ message: 'Access denied: You can only modify your own forms' });
      }
      
      const { questions } = req.body;
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be an array" });
      }
      
      const updatedForm = await storage.bulkImportQuestions(formId, questions);
      res.json(updatedForm);
    } catch (error) {
      console.error("Error bulk importing questions:", error);
      res.status(500).json({ message: "Failed to import questions" });
    }
  });

  app.post('/api/respondents/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { respondents } = req.body;
      if (!Array.isArray(respondents)) {
        return res.status(400).json({ message: "Respondents must be an array" });
      }
      
      const createdRespondents = await storage.bulkCreateRespondents(respondents);
      res.json(createdRespondents);
    } catch (error) {
      console.error("Error bulk creating respondents:", error);
      res.status(500).json({ message: "Failed to create respondents" });
    }
  });

  // Events routes
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getEventsByUser(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse({ ...req.body, createdBy: userId });
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verify ownership
      if (event.createdBy !== req.user.claims.sub) {
        return res.status(403).json({ message: 'Access denied: You can only view your own events' });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.put('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verify ownership
      if (event.createdBy !== req.user.claims.sub) {
        return res.status(403).json({ message: 'Access denied: You can only modify your own events' });
      }
      
      const eventData = insertEventSchema.partial().omit({ createdBy: true }).parse(req.body);
      const updatedEvent = await storage.updateEvent(req.params.id, eventData);
      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verify ownership
      if (event.createdBy !== req.user.claims.sub) {
        return res.status(403).json({ message: 'Access denied: You can only delete your own events' });
      }
      
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event attendees routes
  app.get('/api/events/:id/attendees', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verify ownership
      if (event.createdBy !== req.user.claims.sub) {
        return res.status(403).json({ message: 'Access denied: You can only view attendees for your own events' });
      }
      
      const attendees = await storage.getEventAttendees(req.params.id);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching event attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.post('/api/events/:id/attendees', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verify ownership
      if (event.createdBy !== req.user.claims.sub) {
        return res.status(403).json({ message: 'Access denied: You can only modify your own events' });
      }
      
      const attendeeData = insertEventAttendeeSchema.parse({ ...req.body, eventId });
      const attendee = await storage.addEventAttendee(attendeeData);
      res.json(attendee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attendee data", errors: error.errors });
      }
      console.error("Error adding event attendee:", error);
      res.status(500).json({ message: "Failed to add attendee" });
    }
  });

  // Student routes
  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const { search } = req.query;
      let students;
      
      if (search) {
        students = await storage.searchStudents(search);
      } else {
        students = await storage.getAllStudents();
      }
      
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const studentData = insertStudentSchema.parse({ ...req.body, createdBy: userId });
      const student = await storage.createStudent(studentData);
      res.json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.get('/api/students/:id', isAuthenticated, async (req, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  // Public endpoint to lookup students by BC number(s) - used by public forms
  app.post('/api/public/students/lookup-bc', async (req: any, res) => {
    try {
      const { bcNumbers, formId } = req.body;

      if (!bcNumbers || !Array.isArray(bcNumbers)) {
        return res.status(400).json({ message: "bcNumbers array is required" });
      }

      let selectedRespondents: string[] = [];
      let formType = 'general';

      // If formId is provided, get form settings to check selected respondents
      if (formId) {
        try {
          const form = await storage.getForm(formId);
          if (form && form.settings) {
            const settings = typeof form.settings === 'object' ? form.settings : {};
            selectedRespondents = (settings as any).selectedRespondents || [];
            formType = form.formType || 'general';
          }
        } catch (error) {
          console.error('Error fetching form settings:', error);
        }
      }

      const foundStudents = [];
      const notFoundBCNumbers = [];
      const notSelectedStudents = [];

      for (const bcNumber of bcNumbers) {
        const trimmedBC = bcNumber.trim();
        if (trimmedBC) {
          const student = await storage.getStudentByStudentId(trimmedBC);
          if (student) {
            // For parents_survey forms, check if student is in selected respondents
            if (formType === 'parents_survey' && selectedRespondents.length > 0) {
              if (selectedRespondents.includes(trimmedBC)) {
                foundStudents.push({
                  student_BC: student.student_BC,
                  fullName: student.fullName,
                  level: student.level,
                  class: student.class
                });
              } else {
                // Student exists but is not selected for this survey
                notSelectedStudents.push({
                  student_BC: student.student_BC,
                  fullName: student.fullName,
                  level: student.level,
                  class: student.class
                });
              }
            } else {
              // For general forms or parents_survey with no restrictions, include all found students
              foundStudents.push({
                student_BC: student.student_BC,
                fullName: student.fullName,
                level: student.level,
                class: student.class
              });
            }
          } else {
            notFoundBCNumbers.push(trimmedBC);
          }
        }
      }

      res.json({
        foundStudents,
        notFoundBCNumbers,
        notSelectedStudents: notSelectedStudents.length > 0 ? notSelectedStudents : undefined
      });
    } catch (error) {
      console.error("Error looking up students by BC:", error);
      res.status(500).json({ message: "Failed to lookup students" });
    }
  });

  app.put('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const updates = insertStudentSchema.partial().parse(req.body);
      const updatedStudent = await storage.updateStudent(req.params.id, updates);
      res.json(updatedStudent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      await storage.deleteStudent(req.params.id);
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  app.post('/api/students/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { students: studentData } = req.body;
      
      if (!Array.isArray(studentData) || studentData.length === 0) {
        return res.status(400).json({ message: "Invalid or empty student data array" });
      }

      // Add createdBy to each student record
      const studentsWithCreator = studentData.map(student => ({
        ...student,
        createdBy: userId
      }));

      // Validate all student data
      const validatedStudents = studentsWithCreator.map(student => 
        insertStudentSchema.parse(student)
      );

      const createdStudents = await storage.bulkCreateStudents(validatedStudents);
      res.json({
        message: `Successfully imported ${createdStudents.length} students`,
        students: createdStudents
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      console.error("Error bulk creating students:", error);
      res.status(500).json({ message: "Failed to import students" });
    }
  });

  // Object Storage routes for file uploads
  const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
  
  // Endpoint for getting upload URL for icons
  app.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint for serving private objects (icons)
  app.get('/objects/:objectPath(*)', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint for updating form with icon URL after upload
  app.put('/api/forms/:id/icon', isAuthenticated, async (req, res) => {
    try {
      const formId = req.params.id;
      const { iconURL } = req.body;
      
      if (!iconURL) {
        return res.status(400).json({ error: "iconURL is required" });
      }

      // Get current form to verify ownership
      const form = await storage.getFormById(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      if (form.createdBy !== (req.user as any)?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied: You can only modify your own forms' });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(iconURL);
      
      // Set ACL policy for the uploaded icon (public since it's form icon)
      await objectStorageService.trySetObjectEntityAclPolicy(iconURL, {
        owner: (req.user as any)?.claims?.sub,
        visibility: "public"
      });

      // Update form settings with icon URL
      const currentSettings = form.settings ? (typeof form.settings === 'string' ? JSON.parse(form.settings) : form.settings) : {};
      const updatedSettings = {
        ...currentSettings,
        iconUrl: normalizedPath
      };

      await storage.updateForm(formId, { settings: updatedSettings });
      
      res.json({ objectPath: normalizedPath });
    } catch (error) {
      console.error("Error updating form icon:", error);
      res.status(500).json({ error: "Failed to update form icon" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
