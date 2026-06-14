require("dotenv").config();
const mongoose = require("mongoose");
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✓ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✓ Server started on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });