const request = require("supertest");
const app = require("../src/app");

async function registerUser(email = "test@example.com", password = "password123", name = "Test User") {
  const agent = request.agent(app);
  const regRes = await agent
    .post("/api/auth/register")
    .send({ name, email, password });

  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${regRes.status} ${JSON.stringify(regRes.body)}`);
  }

  const csrfRes = await agent.get("/api/csrf-token");
  const csrfToken = csrfRes.body?.csrfToken;

  return {
    agent,
    cookies: regRes.headers["set-cookie"],
    user: regRes.body.user,
    csrfToken: csrfToken || ""
  };
}

function withCsrf(req, csrfToken) {
  if (csrfToken) {
    return req.set("x-csrf-token", csrfToken);
  }
  return req;
}

module.exports = { registerUser, withCsrf };
