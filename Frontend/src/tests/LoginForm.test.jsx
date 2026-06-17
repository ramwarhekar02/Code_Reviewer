import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import LoginForm from "../components/auth/LoginForm";

const mockLogin = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin })
}));

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm setError={() => {}} />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeDefined();
    expect(screen.getByPlaceholderText("••••••••")).toBeDefined();
  });

  it("shows error when submitted empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm setError={() => {}} />);
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText("All fields are required")).toBeDefined();
  });

  it("calls login() from AuthContext on valid submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm setError={() => {}} />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@test.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockLogin).toHaveBeenCalledWith("test@test.com", "password123");
  });
});
