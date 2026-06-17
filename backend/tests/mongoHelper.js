const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-testing-only";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-for-testing-only";
process.env.CSRF_SECRET = process.env.CSRF_SECRET || "test-csrf-secret";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

let mongoServer = null;
let connectionCount = 0;

async function setup() {
  if (mongoose.connection.readyState !== 0) return;
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function teardown() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

async function cleanup() {
  if (mongoose.connection.readyState === 0) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = { setup, teardown, cleanup };
