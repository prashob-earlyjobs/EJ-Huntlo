const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { seedGlobalTemplates } = require("../services/outreachTemplateService");

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    await seedGlobalTemplates();
    console.log("Outreach templates seeded (global starters).");
  } catch (error) {
    console.error("Failed to seed outreach templates:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
