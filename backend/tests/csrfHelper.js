const request = require("supertest");
const app = require("../src/app");

async function getCsrfToken(agent) {
  if (!agent) {
    agent = request.agent(app);
  }
  const res = await agent.get("/api/csrf-token");
  const csrfToken = res.body?.csrfToken;
  if (!csrfToken) {
    throw new Error("Failed to get CSRF token");
  }
  return { csrfToken, agent };
}

function withCsrf(req, csrfToken) {
  if (!csrfToken) {
    throw new Error("CSRF token is required");
  }
  return req.set("x-csrf-token", csrfToken);
}

module.exports = { getCsrfToken, withCsrf };
