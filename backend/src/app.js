const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const morgan = require("morgan");
const { generateToken } = require("./middleware/csrfMiddleware");
const logger = require("./utils/logger");
const aiRoutes = require("./routes/ai.routes");
const authRoutes = require("../routes/authRoutes");
const historyRoutes = require("../routes/historyRoutes");
const runRoutes = require("./routes/run.routes");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
const allowedOrigin = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan("short", { stream: logger.stream }));

app.get("/api/csrf-token", (req, res) => {
  try {
    const token = generateToken(req, res);
    res.json({ csrfToken: token });
  } catch (err) {
    logger.error("CSRF token generation error:", err.message, { stack: err.stack });
    res.json({ csrfToken: "fallback-token" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/run", runRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Code Reviewer AI API" });
});

app.use((err, req, res, next) => {
  const message = err?.message || "An unexpected error occurred";
  logger.error("Unhandled error:", message, { stack: err?.stack });
  res.status(err?.status || 500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : message
  });
});

module.exports = app;
