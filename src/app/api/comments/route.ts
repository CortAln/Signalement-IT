import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * POST /api/comments — ajout d'un commentaire.
 * - admin connecté : commentaire support (interne ou public)
 * - sans compte : impossible (le suivi public est en lecture seule pour
 *   éviter le spam ; l'utilisateur crée un nouveau signalement si besoin)
 */
export async function POST(req: Request) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { incidentId, body: text, internal } = body ?? {};
  if (!incidentId || !text || typeof text !== "string") {
    return NextResponse.json({ error: "incidentId et body requis" }, { status: 400 });
  }

  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) {
    return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      incidentId,
      authorType: "SUPPORT",
      authorName: admin.name,
      adminId: admin.id,
      body: text.trim().slice(0, 2000),
      internal: Boolean(internal),
    },
  });
  return NextResponse.json({ comment });
}
