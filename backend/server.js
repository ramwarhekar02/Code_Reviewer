require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./src/utils/logger");
const app = require('./src/app');

function validateEnv() {
  const required = ["MONGO_URI", "JWT_SECRET", "PORT"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    logger.error("Server cannot start. Please check your .env file.");
    process.exit(1);
  }
}

validateEnv();

const PORT = process.env.PORT;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("MongoDB connected");
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
