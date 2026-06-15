const router = require("express").Router();
const { execute } = require("../controllers/run.controller");

router.post("/", execute);

module.exports = router;
