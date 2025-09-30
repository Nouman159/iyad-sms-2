import { storage } from "./storage";

async function seedTestUser() {
  try {
    const testUser = {
      id: "form-builder-test",
      email: "formtest@example.com",
      firstName: "Form",
      lastName: "Tester",
      department: "IT",
      userType: "HOD",
      isActive: true
    };

    console.log("Seeding test user...");
    await storage.upsertUser(testUser);
    console.log("Test user seeded successfully");
  } catch (error) {
    console.error("Error seeding test user:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestUser().then(() => process.exit(0));
}

export { seedTestUser };