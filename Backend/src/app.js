const express = require("express");
const path = require("path");
const cors = require("cors");

const apiRoutes = require("./routes");

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://dev.huntlo.online",
  "https://huntlo.online",
  "https://www.huntlo.online",  "https://www.huntlo.ai",  "https://huntlo.ai",
];

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || !String(raw).trim()) return DEFAULT_CORS_ORIGINS;
  const parsed = String(raw)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_CORS_ORIGINS;
}

const app = express();

app.use(
  cors({
    origin: parseCorsOrigins(),
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Welcome to EJHunter API" });
});

app.use("/api", apiRoutes);

module.exports = app;
