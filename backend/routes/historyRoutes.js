const express = require("express");
const router = express.Router();
const { saveReview, getHistory } = require("../controllers/historyController");
const authMiddleware = require("../middleware/authMiddleware");
const { doubleCsrfProtection } = require("../src/middleware/csrfMiddleware");

router.use(authMiddleware);
router.use(doubleCsrfProtection);

router.post("/", saveReview);
router.get("/", getHistory);

module.exports = router;
