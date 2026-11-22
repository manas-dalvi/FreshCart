import { NextResponse } from "next/server";
import {
  isAuthenticatedAdmin,
  getAdminSecret,
  getFastApiUrl,
} from "@/lib/server-admin-auth";

export async function GET(request: Request) {
  const authenticated = await isAuthenticatedAdmin(request);
  if (!authenticated) {
    return NextResponse.json(
      { detail: "Admin authentication required. Please sign in." },
      { status: 401 }
    );
  }

  const secret = getAdminSecret();
  if (!secret) {
    return NextResponse.json(
      { detail: "Server misconfiguration: FRESHCART_ADMIN_SECRET is not configured." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const search = url.search;
    const fastApiTarget = `${getFastApiUrl()}/api/inventory/movements${search}`;

    const res = await fetch(fastApiTarget, {
      cache: "no-store",
      headers: {
        "X-Admin-Key": secret,
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to fetch inventory movements" },
      { status: 502 }
    );
  }
}
