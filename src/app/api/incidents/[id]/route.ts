import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * PATCH /api/incidents/[id] — cycle de vie et assignation (admin).
 * NOUVEAU → EN_COURS → RESOLU → FERME (transitions contrôlées).
 */
const TRANSITIONS: Record<string, string[]> = {
  NOUVEAU: ["EN_COURS", "RESOLU", "FERME"],
  EN_COURS: ["RESOLU", "FERME", "NOUVEAU"],
  RESOLU: ["FERME", "EN_COURS"],
  FERME: ["EN_COURS"],
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { status, assignedToId } = body ?? {};

  const incident = await prisma.incident.findUnique({ where: { id: params.id } });
  if (!incident) {
    return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (status && status !== incident.status) {
    const allowed = TRANSITIONS[incident.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Transition ${incident.status} → ${status} non autorisée` },
        { status: 400 }
      );
    }
    data.status = status;
    if (status === "RESOLU") data.resolvedAt = new Date();
    if (status === "FERME") {
      data.closedAt = new Date();
      if (!incident.resolvedAt) data.resolvedAt = new Date();
    }
    if (status === "EN_COURS" && incident.status === "RESOLU") {
      data.resolvedAt = null;
    }
  }

  if (assignedToId !== undefined) {
    if (assignedToId === null) {
      data.assignedToId = null;
    } else {
      const tech = await prisma.adminUser.findUnique({ where: { id: assignedToId } });
      if (!tech) return NextResponse.json({ error: "Technicien inconnu" }, { status: 400 });
      data.assignedToId = tech.id;
    }
  }

  const updated = await prisma.incident.update({
    where: { id: params.id },
    data,
    include: { room: true, equipment: true, assignedTo: true },
  });
  return NextResponse.json({ incident: updated });
}

/** DELETE /api/incidents/[id] — suppression (admin uniquement, purge RGPD). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireApiAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  await prisma.incident.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
