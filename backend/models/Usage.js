const mongoose = require("mongoose");

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  }
});

usageSchema.index({ userId: 1, date: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model("Usage", usageSchema);
