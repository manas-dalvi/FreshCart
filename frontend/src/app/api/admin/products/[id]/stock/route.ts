import { NextResponse } from "next/server";
import {
  isAuthenticatedAdmin,
  getAdminSecret,
  getFastApiUrl,
} from "@/lib/server-admin-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;
    const body = await request.json();
    const fastApiTarget = `${getFastApiUrl()}/api/products/${id}/stock`;

    const res = await fetch(fastApiTarget, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": secret,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update stock" },
      { status: 502 }
    );
  }
}
