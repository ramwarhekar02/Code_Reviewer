const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    createdAt: user.createdAt
  };
}

async function register(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed });

    const token = signToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

async function login(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signToken(user._id);
    setTokenCookie(res, token);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

async function googleAuth(req, res) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" });
    }

    const { tokens } = await googleClient.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      return res.status(400).json({ message: "Failed to get ID token" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    const { sub: googleId, name, email } = payload;

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = "google";
        await user.save();
      }
    } else {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        googleId,
        provider: "google"
      });
    }

    const token = signToken(user._id);
    setTokenCookie(res, token);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(401).json({ message: "Invalid Google token" });
  }
}

function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.json({ message: "Logged out successfully" });
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { register, login, googleAuth, logout, getMe };
