/**
 * Password policy, kept free of any Node crypto imports so client components
 * (the sign-in modal, the reset form) can share the exact same rules the API
 * enforces without dragging `node:crypto` into the browser bundle.
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Minimum viable strength check: length plus a mix of letters and digits.
 * Deliberately not a maze of rules — length is what actually matters, and
 * over-strict policies push people toward reused passwords.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > 200) {
    return "Password must be under 200 characters.";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}
