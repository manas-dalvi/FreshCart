import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  getAdminSecret,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from "@/lib/server-admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const passkey = body.passkey;

    if (!passkey || typeof passkey !== "string") {
      return NextResponse.json(
        { detail: "Admin passkey is required." },
        { status: 400 }
      );
    }

    const secret = getAdminSecret();
    if (!secret) {
      return NextResponse.json(
        { detail: "Server misconfiguration: FRESHCART_ADMIN_SECRET is not configured." },
        { status: 500 }
      );
    }

    // Timing-safe comparison of passkey with server secret
    const passkeyBuffer = Buffer.from(passkey);
    const secretBuffer = Buffer.from(secret);

    let match = false;
    if (passkeyBuffer.length === secretBuffer.length) {
      match = crypto.timingSafeEqual(passkeyBuffer, secretBuffer);
    }

    if (!match) {
      return NextResponse.json(
        { detail: "Invalid admin passkey. Access denied." },
        { status: 401 }
      );
    }

    const token = createSessionToken(secret);
    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful.",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
