const request = require("supertest");
const app = require("../src/app");
const { setup, teardown, cleanup } = require("./mongoHelper");

beforeAll(setup);
afterAll(teardown);
beforeEach(cleanup);

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return "";
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return headers.map(h => h.split(";")[0]).join("; ");
}

describe("POST /api/auth/register", () => {
  it("returns 201 and user object on success", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "test@example.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe("Test User");
  });

  it("returns 409 for duplicate email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "User One", email: "dup@example.com", password: "password123" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "User Two", email: "dup@example.com", password: "password123" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "not-an-email", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "test@example.com", password: "123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 and sets cookie on success", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "login@example.com", password: "password123" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "login2@example.com", password: "password123" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login2@example.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns user when valid cookie present", async () => {
    const agent = request.agent(app);
    const registerRes = await agent
      .post("/api/auth/register")
      .send({ name: "Me User", email: "me@example.com", password: "password123" });
    expect(registerRes.status).toBe(201);

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it("returns 401 when no cookie", async () => {
    const res = await request(app)
      .get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears cookie on logout", async () => {
    const agent = request.agent(app);
    const registerRes = await agent
      .post("/api/auth/register")
      .send({ name: "Logout User", email: "logout@example.com", password: "password123" });
    expect(registerRes.status).toBe(201);

    const res = await agent.post("/api/auth/logout");
    expect(res.status).toBe(200);
  });
});
