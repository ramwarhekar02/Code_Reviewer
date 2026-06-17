import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSuggestions } from "../services/api";

vi.mock("../utils/api", () => {
  const mockPost = vi.fn();
  return {
    default: {
      post: mockPost,
      get: vi.fn()
    }
  };
});

import api from "../utils/api";

describe("fetchSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the correct endpoint with correct payload", async () => {
    api.post.mockResolvedValue({ data: { summary: "test", items: [] } });
    await fetchSuggestions("const x = 1;", "javascript", 1);
    expect(api.post).toHaveBeenCalledWith("/ai/suggest", {
      code: "const x = 1;",
      language: "javascript",
      cursorLine: 1
    });
  });
});

describe("handleApiError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps 401 to 'Session expired'", async () => {
    api.post.mockRejectedValue({
      response: { status: 401, data: {} }
    });
    await expect(fetchSuggestions("test", "javascript", 1)).rejects.toThrow("Session expired");
  });

  it("maps 429 to 'Rate limit'", async () => {
    api.post.mockRejectedValue({
      response: { status: 429, data: { message: "Too many requests" } }
    });
    await expect(fetchSuggestions("test", "javascript", 1)).rejects.toThrow("Rate limit");
  });

  it("maps network error to 'Cannot connect to server'", async () => {
    api.post.mockRejectedValue({ message: "Network Error" });
    await expect(fetchSuggestions("test", "javascript", 1)).rejects.toThrow("Cannot connect to server");
  });
});
