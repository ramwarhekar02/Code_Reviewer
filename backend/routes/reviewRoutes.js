const express = require("express");
const router = express.Router();
const { saveReview, getHistory } = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", saveReview);
router.get("/", getHistory);

module.exports = router;
