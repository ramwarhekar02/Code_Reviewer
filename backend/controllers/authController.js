const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const logger = require("../src/utils/logger");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

function signAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15m"
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function setTokenCookies(res, accessToken, refreshToken) {
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearTokenCookies(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh"
  });
}

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
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
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: normalizedEmail, password: hashed });

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    const hashedRefresh = hashToken(refreshToken);
    await User.findByIdAndUpdate(user._id, { refreshToken: hashedRefresh });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    logger.error("register error:", err.message);
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
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    const hashedRefresh = hashToken(refreshToken);
    await User.findByIdAndUpdate(user._id, { refreshToken: hashedRefresh });

    setTokenCookies(res, accessToken, refreshToken);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    logger.error("login error:", err.message);
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
    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = "google";
        await user.save();
      }
    } else {
      user = await User.create({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId,
        provider: "google"
      });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    const hashedRefresh = hashToken(refreshToken);
    await User.findByIdAndUpdate(user._id, { refreshToken: hashedRefresh });

    setTokenCookies(res, accessToken, refreshToken);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    logger.error("googleAuth error:", err.message);
    res.status(401).json({ message: "Invalid Google token" });
  }
}

async function refreshToken(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken) {
      return res.status(401).json({ message: "Refresh token revoked" });
    }

    const hashed = hashToken(token);
    if (user.refreshToken !== hashed) {
      return res.status(401).json({ message: "Refresh token mismatch" });
    }

    const newAccessToken = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    const newHashedRefresh = hashToken(newRefreshToken);
    await User.findByIdAndUpdate(user._id, { refreshToken: newHashedRefresh });

    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    logger.error("refreshToken error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

function logout(req, res) {
  const doClear = async () => {
    const token = req.cookies?.refreshToken;
    if (token) {
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        if (decoded?.id) {
          await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
        }
      } catch {}
    }
  };
  doClear();

  clearTokenCookies(res);
  res.json({ message: "Logged out successfully" });
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    logger.error("getMe error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { register, login, googleAuth, logout, getMe, refreshToken };
