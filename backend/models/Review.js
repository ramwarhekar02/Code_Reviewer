const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  markdown: { type: String, required: true }
}, { timestamps: true });

reviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
