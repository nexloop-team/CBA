import { createHmac, createHash, timingSafeEqual } from "node:crypto";

/**
 * Password login for /admin.
 *
 * One shared password (ADMIN_PASSWORD on Vercel). A correct password gets a
 * signed, HttpOnly session cookie, which every /api/admin route checks.
 *
 * Changing ADMIN_PASSWORD signs everyone out, because it is part of the
 * signing key (with the Blob store's token, which never leaves the server).
 */
export const SESSION_COOKIE = "cba_admin";
const SESSION_HOURS = 12;

function signingKey(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return password && token ? `${password}\u0000${token}` : null;
}

function sign(expires: number, key: string): string {
  return createHmac("sha256", key).update(`cba-admin:${expires}`).digest("hex");
}

/** Constant-time comparison, so response timing reveals nothing about the password. */
export function passwordMatches(attempt: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = createHash("sha256").update(attempt).digest();
  const b = createHash("sha256").update(password).digest();
  return timingSafeEqual(a, b);
}

export function createSessionCookie(): string | null {
  const key = signingKey();
  if (!key) return null;
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  const value = `${expires}.${sign(expires, key)}`;
  return `${SESSION_COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function hasValidSession(request: Request): boolean {
  const key = signingKey();
  if (!key) return false;

  const header = request.headers.get("cookie") ?? "";
  const raw = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!raw) return false;

  const [expiresText, signature] = raw.split(".");
  const expires = Number(expiresText);
  if (!expires || !signature || expires < Date.now()) return false;

  const expected = Buffer.from(sign(expires, key));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function adminConfigured(): boolean {
  return signingKey() !== null;
}
