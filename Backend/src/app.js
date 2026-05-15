const express = require("express");
const cors = require("cors");

const apiRoutes = require("./routes");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000","http://localhost:3001"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "Welcome to EJHunter API" });
});

app.use("/api", apiRoutes);

module.exports = app;
