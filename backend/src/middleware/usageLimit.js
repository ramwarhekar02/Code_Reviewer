const Usage = require("../../models/Usage");
const logger = require("../utils/logger");

const DAILY_LIMITS = {
  user: {
    suggest: 10,
    review: 3,
    chat: 5,
    "extract-code": 3,
    "extract-vision": 1
  },
  admin: {
    suggest: 100,
    review: 30,
    chat: 50,
    "extract-code": 20,
    "extract-vision": 10
  }
};

function getDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function usageLimit(endpoint) {
  return async (req, res, next) => {
    try {
      const role = req.user?.role || "user";
      const limit = DAILY_LIMITS[role]?.[endpoint];

      if (limit === undefined) {
        return res.status(500).json({ error: "Unknown endpoint for usage limit" });
      }

      const date = getDateStr();
      let record = await Usage.findOne({ userId: req.user.id, date, endpoint });

      const used = record?.count ?? 0;
      if (used >= limit) {
        const resetAt = new Date();
        resetAt.setHours(23, 59, 59, 999);
        return res.status(429).json({
          error: "Daily usage limit exceeded",
          message: `You have used ${used} of ${limit} allowed requests for ${endpoint} today. Limit resets at midnight.`,
          limit,
          used,
          resetAt: resetAt.toISOString()
        });
      }

      await Usage.findOneAndUpdate(
        { userId: req.user.id, date, endpoint },
        { $inc: { count: 1 } },
        { upsert: true }
      );

      next();
    } catch (error) {
      logger.error("usageLimit error:", error.message);
      next();
    }
  };
}

module.exports = usageLimit;
