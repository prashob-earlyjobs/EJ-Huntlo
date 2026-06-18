const dns = require("dns");
const mongoose = require("mongoose");

async function syncUserIntegrationIndexes() {
  const UserIntegration = require("../models/UserIntegration");
  try {
    await UserIntegration.collection.dropIndex("userId_1_provider_1");
    console.log("Dropped legacy UserIntegration index userId_1_provider_1");
  } catch (err) {
    const msg = String(err?.message || "");
    if (err?.code !== 27 && !/index not found|ns not found/i.test(msg)) {
      console.warn("UserIntegration index migration:", msg);
    }
  }
  try {
    await UserIntegration.syncIndexes();
  } catch (err) {
    console.warn("UserIntegration syncIndexes:", err?.message || err);
  }
}

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  // mongodb+srv:// needs SRV DNS; some Windows resolvers refuse it (querySrv ECONNREFUSED).
  if (mongoUri.startsWith("mongodb+srv://")) {
    const servers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (servers.length) dns.setServers(servers);
  }

  await mongoose.connect(mongoUri);
  await syncUserIntegrationIndexes();
  console.log("MongoDB connected");
};

module.exports = connectDB;
