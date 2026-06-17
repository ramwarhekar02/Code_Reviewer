import api from "../utils/api";

function handleApiError(error) {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  if (error.response?.status === 401) {
    throw new Error("Session expired");
  }
  if (error.response?.status === 429) {
    throw new Error("Rate limit");
  }

  if (error.message === "Network Error") {
    throw new Error("Cannot connect to server");
  }

  throw new Error(error.message || "An unexpected error occurred");
}

export async function fetchSuggestions(code, language, cursorLine) {
  try {
    const response = await api.post("/ai/suggest", { code, language, cursorLine });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function fetchReview(code, language) {
  try {
    const response = await api.post("/ai/review", { code, language });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function fetchChat(code, language, messages) {
  try {
    const response = await api.post("/ai/chat", { code, language, messages });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function validateExtractedCode(text) {
  try {
    const response = await api.post("/ai/extract-code", { text });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function extractCodeWithVision(image) {
  try {
    const response = await api.post("/ai/extract-vision", { image });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function saveReview(code, language, markdown) {
  const response = await api.post("/api/history", { code, language, markdown });
  return response.data;
}

export async function fetchHistory(page = 1, limit = 20) {
  const response = await api.get(`/api/history?page=${page}&limit=${limit}`);
  return response.data;
}

export async function executeCode(code, language) {
  try {
    const response = await api.post("/api/run", { code, language });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}
