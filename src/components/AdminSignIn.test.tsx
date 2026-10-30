import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminSignIn from "./AdminSignIn";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

describe("admin account sign-in", () => {
  it("signs into the existing account without navigating away", async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null });
    render(<AdminSignIn signIn={signIn} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Account password"), { target: { value: "existing-account-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in", exact: true }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("admin@example.com", "existing-account-password"));
  });
  it("keeps a rejected sign-in available for retry", async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<AdminSignIn signIn={signIn} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Account password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in", exact: true }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Invalid login credentials"));
    expect(screen.getByRole("button", { name: "Sign in", exact: true })).not.toBeDisabled();
  });
});