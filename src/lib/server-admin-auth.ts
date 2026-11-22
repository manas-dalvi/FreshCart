import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "freshcart_admin_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 8; // 8 hours

export function getAdminSecret(): string | null {
  return process.env.FRESHCART_ADMIN_SECRET || null;
}

export function getFastApiUrl(): string {
  return process.env.FASTAPI_INTERNAL_URL || "http://127.0.0.1:8000";
}

/**
 * Creates an HMAC-signed session token.
 * Format: <timestamp>.<hex_hmac>
 */
export function createSessionToken(secret: string): string {
  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac("sha256", secret).update(timestamp).digest("hex");
  return `${timestamp}.${hmac}`;
}

/**
 * Verifies an HMAC-signed session token.
 */
export function verifySessionToken(token: string | null | undefined, secret: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestampStr, expectedHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Session expiry check (8 hours)
  const age = Date.now() - timestamp;
  if (age < 0 || age > SESSION_MAX_AGE_SEC * 1000) return false;

  // Recalculate HMAC
  const actualHmac = crypto.createHmac("sha256", secret).update(timestampStr).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(actualHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Validates request authentication against cookies or X-Admin-Session header.
 */
export async function isAuthenticatedAdmin(request: Request): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;

  // 1. Check HttpOnly cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken && verifySessionToken(cookieToken, secret)) {
    return true;
  }

  // 2. Check X-Admin-Session header (for programmatic or test calls)
  const headerToken = request.headers.get("x-admin-session");
  if (headerToken && verifySessionToken(headerToken, secret)) {
    return true;
  }

  return false;
}
