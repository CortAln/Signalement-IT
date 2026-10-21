import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/health — sonde de disponibilité (uptime monitoring, load balancer).
 * Public par nature : ne divulgue aucune donnée métier.
 */
export async function GET() {
  let db = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    // db reste "down"
  }
  return NextResponse.json(
    { ok: db === "up", db, ts: new Date().toISOString() },
    { status: db === "up" ? 200 : 503 }
  );
}
