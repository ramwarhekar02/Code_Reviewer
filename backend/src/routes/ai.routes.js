const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");

router.post("/suggest", aiController.suggest);
router.post("/review", aiController.review);
router.post("/chat", aiController.chat);

module.exports = router;
