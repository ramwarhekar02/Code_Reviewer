const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { doubleCsrfProtection } = require("../middleware/csrfMiddleware");
const usageLimit = require("../middleware/usageLimit");

router.use(authMiddleware);
router.use(doubleCsrfProtection);

router.post("/suggest", usageLimit("suggest"), aiController.suggest);
router.post("/review", usageLimit("review"), aiController.review);
router.post("/chat", usageLimit("chat"), aiController.chat);
router.post("/extract-code", usageLimit("extract-code"), aiController.extractCode);
router.post("/extract-vision", usageLimit("extract-vision"), aiController.extractVision);

module.exports = router;
