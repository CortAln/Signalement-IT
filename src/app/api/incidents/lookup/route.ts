import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/incidents/lookup?token=… — vérifie qu'un jeton de suivi
 * correspond à un signalement (page publique « Suivre mon ticket »).
 * Ne renvoie volontairement aucune donnée : juste 200 ou 404.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Jeton requis" }, { status: 400 });
  }
  const incident = await prisma.incident.findUnique({
    where: { token },
    select: { id: true },
  });
  if (!incident) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
