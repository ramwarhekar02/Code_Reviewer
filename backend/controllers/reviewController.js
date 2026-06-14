const Review = require("../models/Review");

async function saveReview(req, res) {
  try {
    const { code, language, markdown } = req.body;
    if (!code || !language || !markdown) {
      return res.status(400).json({ error: "code, language, and markdown are required" });
    }
    const review = await Review.create({ userId: req.user.id, code, language, markdown });
    res.status(201).json({ reviewId: review._id });
  } catch (error) {
    console.error("saveReview error:", error.message);
    res.status(500).json({ error: "Failed to save review" });
  }
}

async function getHistory(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("code language markdown createdAt")
        .lean(),
      Review.countDocuments({ userId: req.user.id })
    ]);

    res.json({ reviews, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("getHistory error:", error.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
}

module.exports = { saveReview, getHistory };
