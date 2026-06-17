const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    default: null
  },
  provider: {
    type: String,
    enum: ["manual", "google"],
    default: "manual"
  },
  refreshToken: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ refreshToken: 1 });

module.exports = mongoose.model("User", userSchema);
