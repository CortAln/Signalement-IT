import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { notifyRequester } from "@/lib/notify";
import { NextResponse } from "next/server";

/**
 * POST /api/comments/public — le déclarant ajoute une précision à son ticket.
 * Authentifié par le jeton de suivi : aucun compte requis.
 * Si le ticket était « EN_ATTENTE », il repasse « EN_COURS ».
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, body: text } = body ?? {};
  if (!token || !text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Jeton et message requis." },
      { status: 400 }
    );
  }

  const incident = await prisma.incident.findUnique({
    where: { token },
    include: { room: true, equipment: true },
  });
  if (!incident) {
    return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
  }
  if (incident.status === "FERME") {
    return NextResponse.json(
      { error: "Ce signalement est fermé. Merci d'en créer un nouveau si le problème revient." },
      { status: 409 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      incidentId: incident.id,
      authorType: "UTILISATEUR",
      authorName: incident.reporterName || "Déclarant",
      body: text.trim().slice(0, 2000),
      internal: false,
    },
  });

  const data: Record<string, unknown> = {};
  if (incident.status === "EN_ATTENTE") data.status = "EN_COURS";
  if (Object.keys(data).length > 0) {
    await prisma.incident.update({ where: { id: incident.id }, data });
  }

  await logActivity(incident.id, "COMMENT", "Déclarant", "Réponse du déclarant");

  // Prévenir le support (email IT si configuré) qu'une précision est arrivée
  notifyRequester(
    incident,
    "Précision ajoutée à votre signalement",
    "Votre message a bien été transmis à l'équipe IT."
  ).catch(() => {});

  return NextResponse.json({ comment });
}
