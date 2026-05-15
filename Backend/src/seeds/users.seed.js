const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/User");

dotenv.config();

const sampleUsers = [
  {
    fullName: "Rahul Verma",
    companyName: "EarlyJobs",
    mobile: "+91 9876500001",
    email: "rahul.verma@ejhunter.com",
    password: "Password@123",
    role: "admin",
    credits: 500,
  },
  {
    fullName: "Ananya Iyer",
    companyName: "TalentBridge",
    mobile: "+91 9876500002",
    email: "ananya.iyer@ejhunter.com",
    password: "Password@123",
    role: "user",
    credits: 100,
  },
  {
    fullName: "Vikram Sinha",
    companyName: "HireFast",
    mobile: "+91 9876500003",
    email: "vikram.sinha@ejhunter.com",
    password: "Password@123",
    role: "user",
    credits: 100,
  },
];

const seedUsers = async () => {
  try {
    await connectDB();

    for (const entry of sampleUsers) {
      const hashedPassword = await bcrypt.hash(entry.password, 10);

      await User.updateOne(
        { email: entry.email.toLowerCase() },
        {
          $set: {
            fullName: entry.fullName,
            companyName: entry.companyName,
            mobile: entry.mobile,
            email: entry.email.toLowerCase(),
            password: hashedPassword,
            role: entry.role,
            credits: entry.credits ?? 0,
          },
        },
        { upsert: true }
      );
    }

    console.log(`Seeded ${sampleUsers.length} sample users`);
  } catch (error) {
    console.error("Failed to seed users:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedUsers();
