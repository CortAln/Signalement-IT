import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

/**
 * POST /api/incidents/feedback — avis du déclarant après résolution (v2.1).
 * Authentifié par le jeton de suivi public : pas de compte requis.
 * { token: string, value: 1 | -1 }
 *
 * v3 : un 👎 (« toujours gênant ») réouvre automatiquement le ticket
 * en EN_COURS et le journalise, façon helpdesk.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, value } = body ?? {};

  if (!token || (value !== 1 && value !== -1)) {
    return NextResponse.json(
      { error: "Jeton et avis (1 ou -1) requis." },
      { status: 400 }
    );
  }

  const incident = await prisma.incident.findUnique({ where: { token } });
  if (!incident) {
    return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
  }
  if (incident.status !== "RESOLU" && incident.status !== "FERME") {
    return NextResponse.json(
      { error: "Ce signalement n'est pas encore résolu." },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = { satisfaction: value, feedbackAt: new Date() };

  // 👎 : le déclarant indique que le problème persiste → réouverture.
  let reopened = false;
  if (value === -1) {
    data.status = "EN_COURS";
    data.resolvedAt = null;
    reopened = true;
  }

  await prisma.incident.update({ where: { id: incident.id }, data });

  await logActivity(
    incident.id,
    "FEEDBACK",
    "Déclarant",
    value === 1 ? "👍 Résolu pour moi" : "👎 Toujours gênant — ticket réouvert"
  );
  if (reopened) {
    await prisma.comment
      .create({
        data: {
          incidentId: incident.id,
          authorType: "UTILISATEUR",
          authorName: incident.reporterName || "Déclarant",
          body: "Le déclarant indique que le problème n'est pas résolu. Ticket réouvert automatiquement.",
          internal: true,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, satisfaction: value, reopened });
}
