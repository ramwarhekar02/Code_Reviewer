const crypto = require("crypto");

const isTest = process.env.NODE_ENV === "test";
const COOKIE_NAME = "csrf-token";
const HEADER_NAME = "x-csrf-token";

function generateToken(req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return token;
}

function doubleCsrfProtection(req, res, next) {
  if (isTest) return next();
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.headers[HEADER_NAME];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: "Forbidden",
      message: "CSRF token missing"
    });
  }

  if (cookieToken !== headerToken) {
    return res.status(403).json({
      error: "Forbidden",
      message: "CSRF token mismatch"
    });
  }

  next();
}

module.exports = { generateToken, doubleCsrfProtection };
