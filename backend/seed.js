require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Review = require("./models/Review");
const logger = require("./src/utils/logger");

const starterCode = `function twoSum(nums, target) {
  const seen = new Map();

  for (let index = 0; index < nums.length; index += 1) {
    const complement = target - nums[index];

    if (seen.has(complement)) {
      return [seen.get(complement), index];
    }

    seen.set(nums[index], index);
  }

  return [];
}`;

const sampleReview = {
  code: starterCode,
  language: "javascript",
  markdown: `### QUALITY SCORE
  ⭐ Overall: 8/10
  📊 Readability: 8/10 | ⚡ Performance: 8/10 | 🏗️ Structure: 8/10

---

### INLINE CODE
\`\`\`javascript
function twoSum(nums, target) { // ✅ Clear function name indicates purpose
  const seen = new Map(); // ✅ Using Map for storing previously seen numbers

  for (let index = 0; index < nums.length; index += 1) { // ⚠️ Consider using \\\`for...of\\\` for better readability
    const complement = target - nums[index]; //

    if (seen.has(complement)) { //
      return [seen.get(complement), index]; //
    }

    seen.set(nums[index], index); //
  }

  return []; // ❌ Returning an empty array without a comment may confuse users
}
\`\`\`

---

### APPROACH
  🧩 Two-pointer algorithm — A technique to find pairs that sum to a target value.

---

### COMPLEXITY
  ⏱️ Time: O(n) — We loop through the numbers once
  💾 Space: O(n) — We store numbers in a map

---

### SUGGESTIONS

┌─────────────────────────────────────────┐
│ 💡 #1 — Improve Empty Return Clarity   │
│ Impact: 🟡 Medium                       │
│ Type: Readability                       │
│                                          │
│ ❌ Current:                              │
│ return [];                               │
│                                          │
│ ✅ Better:                               │
│ return []; // No pairs were found        │
│                                          │
│ 📖 Why                                    │
│ It helps others understand why           │
└─────────────────────────────────────────┘

---

### KEY LINES
  🔍 Max 3 most important lines:
  → Line 9: return [seen.get(complement), index];
     └─ This is the main return statement that provides the solution.

---

### WHAT YOU DID WELL
  ✅ You used a Map for efficient lookups.
  ✅ The code structure is clean and logical.
  ✅ The function does exactly what it's meant to do.

---

### NEXT STEP
  🎓 Learn about error handling — It will help you write more robust and user-friendly code.`
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected for seeding");

    const hashed = await bcrypt.hash("seedpass123", 12);
    const user = await User.findOneAndUpdate(
      { email: "sample@seed.local" },
      {
        name: "Sample User",
        email: "sample@seed.local",
        password: hashed,
        provider: "manual",
        role: "user",
        createdAt: new Date()
      },
      { upsert: true, returnDocument: "after" }
    );
    logger.info(`Sample user created: ${user.email}`);

    await Review.deleteMany({ userId: user._id });
    await Review.create({ userId: user._id, ...sampleReview });
    logger.info("Sample review seeded");

    logger.info("Seeding complete");
    process.exit(0);
  } catch (err) {
    logger.error("Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
