import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST /api/incidents/feedback — avis du déclarant après résolution (v2.1).
 * Authentifié par le jeton de suivi public : pas de compte requis.
 * { token: string, value: 1 | -1 }
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

  await prisma.incident.update({
    where: { id: incident.id },
    data: { satisfaction: value, feedbackAt: new Date() },
  });

  return NextResponse.json({ ok: true, satisfaction: value });
}
