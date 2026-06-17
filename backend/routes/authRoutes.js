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
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
      })
      .withMessage("Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character")
  ],
  register
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
  ],
  login
);

router.post("/refresh", refreshToken);

router.post("/google", authLimiter, googleAuth);

router.post("/logout", logout);

router.get("/me", authMiddleware, getMe);

module.exports = router;
