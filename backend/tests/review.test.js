const request = require("supertest");
const app = require("../src/app");
const { setup, teardown, cleanup } = require("./mongoHelper");
const { registerUser, withCsrf } = require("./authHelper");

beforeAll(setup);
afterAll(teardown);
beforeEach(cleanup);

describe("POST /api/history", () => {
  it("saves review when authenticated (201)", async () => {
    const { agent, csrfToken } = await registerUser("review-save@example.com");
    const res = await withCsrf(
      agent.post("/api/history").send({ code: "console.log('hi')", language: "javascript", markdown: "# Review" }),
      csrfToken
    );
    expect(res.status).toBe(201);
    expect(res.body.reviewId).toBeDefined();
  });

  it("rejects unauthenticated (401)", async () => {
    const res = await request(app).post("/api/history").send({
      code: "console.log('hi')", language: "javascript", markdown: "# Review"
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing fields (400)", async () => {
    const { agent, csrfToken } = await registerUser("review-missing@example.com");
    const res = await withCsrf(
      agent.post("/api/history").send({ code: "console.log('hi')" }),
      csrfToken
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/history", () => {
  it("returns paginated history for authenticated user", async () => {
    const { agent, csrfToken } = await registerUser("review-history@example.com");
    await withCsrf(
      agent.post("/api/history").send({ code: "a", language: "javascript", markdown: "# R1" }),
      csrfToken
    );
    await withCsrf(
      agent.post("/api/history").send({ code: "b", language: "python", markdown: "# R2" }),
      csrfToken
    );

    const res = await agent.get("/api/history");
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  it("returns default page/limit", async () => {
    const { agent } = await registerUser("review-default@example.com");
    const res = await agent.get("/api/history");
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it("respects custom page/limit", async () => {
    const { agent } = await registerUser("review-custom@example.com");
    const res = await agent.get("/api/history?page=2&limit=5");
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(5);
  });

  it("caps limit at 50", async () => {
    const { agent } = await registerUser("review-cap@example.com");
    const res = await agent.get("/api/history?limit=100");
    expect(res.body.limit).toBe(50);
  });
});
