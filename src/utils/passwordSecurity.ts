// Password hashing (PBKDF2-SHA256, per-user salt) and policy helpers. Plaintext passwords are never stored.

const ITERATIONS = 210_000;
export const MIN_PASSWORD_LENGTH = 8;
export const LEGACY_DEFAULT_PASSWORD = "BiDOCS#2026";

const toB64 = (buf: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const fromB64 = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const derive = async (password: string, salt: Uint8Array): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    256,
  );
  return toB64(bits);
};

export const hashPassword = async (
  password: string,
): Promise<{ passwordHash: string; passwordSalt: string }> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { passwordHash: await derive(password, salt), passwordSalt: toB64(salt) };
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
  passwordSalt: string,
): Promise<boolean> => {
  const candidate = await derive(password, fromB64(passwordSalt));
  // Constant-time compare
  if (candidate.length !== passwordHash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ passwordHash.charCodeAt(i);
  }
  return diff === 0;
};

/** Returns an error message, or null when the password is acceptable. */
export const validatePassword = (password: string): string | null => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (password === LEGACY_DEFAULT_PASSWORD) {
    return "That password is publicly known. Choose a different one.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
};

/** One-time temporary password shown to the approver who resets or creates an account. */
export const generateTempPassword = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${body}7a`; // guarantees a digit and a letter
};
