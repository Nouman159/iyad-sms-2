import { storage } from "./storage";

export async function seedFormTemplates() {
  try {
    const templates = [
      {
        name: "Student Feedback Survey",
        description: "Comprehensive feedback survey for student course evaluation",
        category: "survey",
        createdBy: "system",
        template: {
          questions: [
            { id: "1", type: "rating", question: "Overall course satisfaction", required: true, scale: 5 },
            { id: "2", type: "text", question: "What did you like most about this course?", required: false },
            { id: "3", type: "multipleChoice", question: "Would you recommend this course?", required: true, options: ["Yes", "No", "Maybe"] },
            { id: "4", type: "textarea", question: "Any additional comments?", required: false }
          ],
          settings: {
            allowAnonymous: true,
            requireLogin: false,
            showProgress: true
          }
        },
        tags: ["feedback", "course", "education"],
        isPublic: true
      },
      {
        name: "Event Registration Form",
        description: "Standard event registration with participant details",
        category: "registration",
        createdBy: "system",
        template: {
          questions: [
            { id: "1", type: "text", question: "Full Name", required: true },
            { id: "2", type: "email", question: "Email Address", required: true },
            { id: "3", type: "phone", question: "Phone Number", required: true },
            { id: "4", type: "select", question: "Department", required: true, options: ["IT", "HR", "Finance", "Operations"] },
            { id: "5", type: "checkbox", question: "Dietary Requirements", required: false, options: ["Vegetarian", "Vegan", "Gluten-free", "No restrictions"] }
          ],
          settings: {
            allowAnonymous: false,
            requireLogin: true,
            showProgress: true,
            sendConfirmation: true
          }
        },
        tags: ["registration", "event", "participants"],
        isPublic: true
      },
      {
        name: "Incident Report Form",
        description: "Structured incident reporting with severity levels",
        category: "assessment",
        createdBy: "system",
        template: {
          questions: [
            { id: "1", type: "datetime", question: "Incident Date & Time", required: true },
            { id: "2", type: "select", question: "Incident Type", required: true, options: ["Safety", "Security", "IT", "Equipment", "Other"] },
            { id: "3", type: "select", question: "Severity Level", required: true, options: ["Low", "Medium", "High", "Critical"] },
            { id: "4", type: "textarea", question: "Incident Description", required: true },
            { id: "5", type: "text", question: "Location", required: true },
            { id: "6", type: "textarea", question: "Immediate Actions Taken", required: false }
          ],
          settings: {
            allowAnonymous: false,
            requireLogin: true,
            showProgress: false,
            notifyAdmin: true
          }
        },
        tags: ["incident", "safety", "reporting"],
        isPublic: true
      },
      {
        name: "Training Assessment Quiz",
        description: "Knowledge assessment with scoring and feedback",
        category: "assessment",
        createdBy: "system",
        template: {
          questions: [
            { id: "1", type: "multipleChoice", question: "Which of the following is a safety protocol?", required: true, options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "Option A" },
            { id: "2", type: "trueFalse", question: "Emergency exits should always be clearly marked", required: true, correctAnswer: true },
            { id: "3", type: "multipleChoice", question: "What should you do in case of fire?", required: true, options: ["Run", "Walk to exit", "Use elevator", "Hide"], correctAnswer: "Walk to exit" }
          ],
          settings: {
            allowAnonymous: false,
            requireLogin: true,
            showProgress: true,
            showScore: true,
            passingScore: 70
          }
        },
        tags: ["training", "assessment", "quiz"],
        isPublic: true
      }
    ];

    console.log("Seeding form templates...");
    for (const template of templates) {
      await storage.createForm(template);
    }
    console.log(`Successfully seeded ${templates.length} form templates`);
  } catch (error) {
    console.error("Error seeding form templates:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFormTemplates().then(() => process.exit(0));
}