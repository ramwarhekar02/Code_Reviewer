const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const aiRoutes = require("./routes/ai.routes");
const authRoutes = require("../routes/authRoutes");
const reviewRoutes = require("../routes/reviewRoutes");
const runRoutes = require("./routes/run.routes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/run", runRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Code Reviewer AI API" });
});

module.exports = app;
