const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  refreshToken
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 10,
  message: { message: "Too many attempts, please try again later" }
});

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters")
  ],
  register
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  login
);

router.post("/refresh", refreshToken);

router.post("/google", authLimiter, googleAuth);

router.post("/logout", logout);

router.get("/me", authMiddleware, getMe);

module.exports = router;
