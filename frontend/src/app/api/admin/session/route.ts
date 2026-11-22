import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/server-admin-auth";

export async function GET(request: Request) {
  const authenticated = await isAuthenticatedAdmin(request);
  return NextResponse.json({ authenticated });
}
