const request = require("supertest");
const app = require("../src/app");
const { setup, teardown, cleanup } = require("./mongoHelper");
const { getCsrfToken, withCsrf } = require("./csrfHelper");

beforeAll(setup);
afterAll(teardown);
beforeEach(cleanup);

describe("POST /api/run", () => {
  it("JavaScript console.log returns output", async () => {
    const { csrfToken, agent } = await getCsrfToken();
    const res = await withCsrf(
      agent.post("/api/run").send({ code: 'console.log("hello")', language: "javascript" }),
      csrfToken
    );
    expect(res.status).toBe(200);
    expect(res.body.output).toMatch(/hello/);
  });

  it("Python print returns output (or runtime not found)", async () => {
    const { csrfToken, agent } = await getCsrfToken();
    const res = await withCsrf(
      agent.post("/api/run").send({ code: 'print("hello")', language: "python" }),
      csrfToken
    );
    expect(res.status).toBe(200);
    if (res.body.output) {
      expect(res.body.output).toMatch(/hello/);
    }
  });

  it("returns 400 for unsupported language", async () => {
    const { csrfToken, agent } = await getCsrfToken();
    const res = await withCsrf(
      agent.post("/api/run").send({ code: 'print("hello")', language: "ruby" }),
      csrfToken
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty code", async () => {
    const { csrfToken, agent } = await getCsrfToken();
    const res = await withCsrf(
      agent.post("/api/run").send({ code: "", language: "javascript" }),
      csrfToken
    );
    expect(res.status).toBe(400);
  });

  it("returns timeout error for infinite loop", async () => {
    const { csrfToken, agent } = await getCsrfToken();
    const res = await withCsrf(
      agent.post("/api/run").send({ code: "while(true){}", language: "javascript" }),
      csrfToken
    );
    expect(res.status).toBe(200);
    expect(res.body.error).toBeTruthy();
  }, 15000);
}, 60000);
