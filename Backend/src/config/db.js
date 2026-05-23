const dns = require("dns");
const mongoose = require("mongoose");

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
  console.log("MongoDB connected");
};

module.exports = connectDB;
