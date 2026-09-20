import { z } from "zod";

export const PASSWORD_REQUIREMENTS =
  "Use at least 8 characters, including uppercase, lowercase, and a number. Avoid common or previously leaked passwords.";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const validatePassword = (password: string) => {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0]?.message || "Choose a stronger password.";
};