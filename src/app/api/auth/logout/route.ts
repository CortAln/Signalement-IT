import { destroySession } from "@/lib/auth";
import { NextResponse } from "next/server";

/** POST /api/auth/logout — déconnexion console admin. */
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
