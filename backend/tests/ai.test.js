const request = require("supertest");
const app = require("../src/app");
const { setup, teardown, cleanup } = require("./mongoHelper");
const { registerUser, withCsrf } = require("./authHelper");

beforeAll(setup);
afterAll(teardown);
beforeEach(cleanup);

jest.mock("../src/services/ai.service", () => {
  return {
    USE_MOCK_MODE: false,
    getSuggestion: jest.fn().mockResolvedValue({
      summary: "Test",
      items: [{ line: 1, severity: "info", title: "Test", detail: "", suggestion: "" }]
    }),
    getReview: jest.fn().mockResolvedValue("# Mock Review"),
    getChatResponse: jest.fn().mockResolvedValue({
      answer: "A helpful response",
      suggestedActions: []
    })
  };
});

describe("POST /ai/suggest", () => {
  it("returns suggestion array", async () => {
    const { agent, csrfToken } = await registerUser("ai-suggest@example.com");
    const res = await withCsrf(
      agent.post("/ai/suggest").send({ code: "const x = 1;", language: "javascript" }),
      csrfToken
    );
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });

  it("rejects unauthenticated", async () => {
    const res = await request(app).post("/ai/suggest").send({
      code: "const x = 1;", language: "javascript"
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /ai/review", () => {
  it("returns markdown string", async () => {
    const { agent, csrfToken } = await registerUser("ai-review@example.com");
    const res = await withCsrf(
      agent.post("/ai/review").send({ code: "const x = 1;", language: "javascript" }),
      csrfToken
    );
    expect(res.status).toBe(200);
  });

  it("rejects unauthenticated", async () => {
    const res = await request(app).post("/ai/review").send({ code: "const x = 1;" });
    expect(res.status).toBe(401);
  });
});

describe("POST /ai/chat", () => {
  it("returns chat message", async () => {
    const { agent, csrfToken } = await registerUser("ai-chat@example.com");
    const res = await withCsrf(
      agent.post("/ai/chat").send({
        code: "const x = 1;",
        messages: [{ role: "user", content: "how does this work?" }]
      }),
      csrfToken
    );
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeDefined();
  });

  it("rejects unauthenticated", async () => {
    const res = await request(app).post("/ai/chat").send({
      code: "const x = 1;", messages: [{ role: "user", content: "hi" }]
    });
    expect(res.status).toBe(401);
  });
});
