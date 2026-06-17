const router = require("express").Router();
const { execute } = require("../controllers/run.controller");
const { doubleCsrfProtection } = require("../middleware/csrfMiddleware");

router.use(doubleCsrfProtection);

router.post("/", execute);

module.exports = router;
