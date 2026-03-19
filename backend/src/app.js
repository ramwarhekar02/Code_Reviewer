const express = require("express");
const cors = require("cors");
const aiRoutes = require("./routes/ai.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Code Reviewer AI API" });
});

module.exports = app;
