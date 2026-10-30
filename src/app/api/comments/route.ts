import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

/**
 * POST /api/comments — ajout d'un commentaire agent.
 * - admin connecté : commentaire support (interne ou public)
 * - profil LECTEUR : refusé
 */
export async function POST(req: Request) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (admin.role === "LECTEUR") {
    return NextResponse.json({ error: "Profil en lecture seule" }, { status: 403 });
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

  // Premier commentaire public du support = première réponse (KPI réactivité)
  if (!internal && !incident.firstResponseAt) {
    await prisma.incident
      .update({ where: { id: incidentId }, data: { firstResponseAt: new Date() } })
      .catch(() => {});
  }

  await logActivity(
    incidentId,
    "COMMENT",
    admin.name,
    internal ? "Commentaire interne" : "Commentaire public"
  );

  return NextResponse.json({ comment });
}
