import { NextResponse } from "next/server";
import {
  isAuthenticatedAdmin,
  getAdminSecret,
  getFastApiUrl,
} from "@/lib/server-admin-auth";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ ref: string }> }
) {
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
    const { ref } = await props.params;
    const payload = await request.json().catch(() => ({}));
    const fastApiTarget = `${getFastApiUrl()}/api/orders/${encodeURIComponent(ref)}/status`;

    const res = await fetch(fastApiTarget, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": secret,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to connect to backend service" },
      { status: 502 }
    );
  }
}
