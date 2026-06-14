const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const authMiddleware = require("../../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/suggest", aiController.suggest);
router.post("/review", aiController.review);
router.post("/chat", aiController.chat);

module.exports = router;
