import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notifyAssignment, notifyRequester } from "@/lib/notify";
import {
  PRIORITY_MAP,
  TICKET_TYPE_MAP,
  slaDueDate,
  statusLabel,
  ticketTypeLabel,
} from "@/lib/data";
import { NextResponse } from "next/server";

/**
 * PATCH /api/incidents/[id] — cycle de vie et métadonnées du ticket (agent).
 * NOUVEAU → EN_COURS → (EN_ATTENTE) → RESOLU → FERME (transitions contrôlées).
 * Champs modifiables : status, assignedToId, priority, type, tags,
 * timeSpent (+minutes), escalated, resolutionNote, criticality.
 */
const TRANSITIONS: Record<string, string[]> = {
  NOUVEAU: ["EN_COURS", "EN_ATTENTE", "RESOLU", "FERME"],
  EN_COURS: ["EN_ATTENTE", "RESOLU", "FERME", "NOUVEAU"],
  EN_ATTENTE: ["EN_COURS", "RESOLU", "FERME"],
  RESOLU: ["FERME", "EN_COURS", "EN_ATTENTE"],
  FERME: ["EN_COURS"],
};

type IncidentWithRefs = {
  id: string;
  ticketNumber: string;
  token: string;
  status: string;
  reporterEmail: string | null;
  resolvedAt: Date | null;
} & {
  room: { name: string };
  equipment: { name: string } | null;
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (admin.role === "LECTEUR") {
    return NextResponse.json({ error: "Profil en lecture seule" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    status,
    assignedToId,
    priority,
    type,
    tags,
    timeSpent,
    escalated,
    resolutionNote,
    criticality,
  } = body ?? {};

  const incident = await prisma.incident.findUnique({
    where: { id: params.id },
    include: { room: true, equipment: true },
  });
  if (!incident) {
    return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const actor = admin.name;
  const after = (
    patch: Record<string, unknown>
  ): IncidentWithRefs => ({ ...incident, ...patch } as IncidentWithRefs);

  // ── Statut ──
  if (status && status !== incident.status) {
    const allowed = TRANSITIONS[incident.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Transition ${incident.status} → ${status} non autorisée` },
        { status: 400 }
      );
    }
    data.status = status;
    if (status === "EN_COURS" || status === "EN_ATTENTE") {
      if (!incident.firstResponseAt) data.firstResponseAt = new Date();
    }
    if (status === "RESOLU") {
      data.resolvedAt = new Date();
      if (!incident.firstResponseAt) data.firstResponseAt = new Date();
    }
    if (status === "FERME") {
      data.closedAt = new Date();
      if (!incident.resolvedAt) data.resolvedAt = new Date();
    }
    if (status === "EN_COURS" && (incident.status === "RESOLU" || incident.status === "FERME")) {
      data.resolvedAt = null;
      data.satisfaction = null;
      data.feedbackAt = null;
    }
    const reopened = status === "EN_COURS" && (incident.status === "FERME" || incident.status === "RESOLU");
    await logActivity(
      incident.id,
      reopened ? "REOPENED" : "STATUS",
      actor,
      `${statusLabel(incident.status)} → ${statusLabel(status)}`
    );
    notifyRequester(
      after(data),
      status === "RESOLU"
        ? "Votre signalement est résolu ✅"
        : status === "FERME"
          ? "Votre signalement est fermé"
          : status === "EN_ATTENTE"
            ? "Une information est attendue de votre part"
            : "Mise à jour de votre signalement",
      status === "RESOLU"
        ? "Bonne nouvelle : l'équipe IT indique que votre problème est résolu. Pensez à vérifier de votre côté, puis laissez votre avis sur la page de suivi."
        : status === "EN_ATTENTE"
          ? "L'équipe IT attend un élément de votre part pour continuer. Merci de répondre depuis la page de suivi."
          : `Le statut de votre signalement est désormais : ${statusLabel(status)}.`
    ).catch(() => {});
  }

  // ── Assignation ──
  if (assignedToId !== undefined) {
    if (assignedToId === null) {
      data.assignedToId = null;
      await logActivity(incident.id, "ASSIGNED", actor, "Désassigné");
    } else {
      const tech = await prisma.adminUser.findUnique({ where: { id: assignedToId } });
      if (!tech) return NextResponse.json({ error: "Technicien inconnu" }, { status: 400 });
      data.assignedToId = tech.id;
      await logActivity(incident.id, "ASSIGNED", actor, tech.name);
      if (tech.id !== incident.assignedToId) {
        notifyAssignment(after(data), { email: tech.email, name: tech.name }).catch(() => {});
      }
    }
  }

  // ── Priorité (recalcul de l'échéance SLA) ──
  if (priority && priority !== incident.priority && PRIORITY_MAP[priority]) {
    data.priority = priority;
    data.dueAt = slaDueDate(incident.createdAt, priority);
    await logActivity(
      incident.id,
      "PRIORITY",
      actor,
      `${incident.priority} → ${priority}`
    );
  }

  // ── Type de ticket ──
  if (type && type !== incident.type && TICKET_TYPE_MAP[type]) {
    data.type = type;
    await logActivity(
      incident.id,
      "TYPE",
      actor,
      `${ticketTypeLabel(incident.type)} → ${ticketTypeLabel(type)}`
    );
  }

  // ── Criticité (ressenti déclarant, corrigée par l'agent) ──
  if (criticality && criticality !== incident.criticality) {
    data.criticality = criticality;
    await logActivity(incident.id, "CRITICALITY", actor, `${incident.criticality} → ${criticality}`);
  }

  // ── Tags ──
  if (typeof tags === "string" && tags !== incident.tags) {
    const cleaned = tags.trim().slice(0, 200);
    data.tags = cleaned;
    await logActivity(incident.id, "TAGS", actor, cleaned || "(aucun)");
  }

  // ── Temps passé (incrément en minutes) ──
  if (typeof timeSpent === "number" && timeSpent > 0 && timeSpent <= 24 * 60) {
    data.timeSpent = { increment: Math.round(timeSpent) };
    await logActivity(incident.id, "TIME", actor, `${Math.round(timeSpent)} min`);
  }

  // ── Escalade ──
  if (typeof escalated === "boolean" && escalated !== incident.escalated) {
    data.escalated = escalated;
    await logActivity(incident.id, "ESCALATED", actor, escalated ? "Escaladé" : "Escalade retirée");
  }

  // ── Note de résolution ──
  if (typeof resolutionNote === "string" && resolutionNote.trim() !== (incident.resolutionNote ?? "")) {
    data.resolutionNote = resolutionNote.trim().slice(0, 2000) || null;
    await logActivity(incident.id, "RESOLUTION_NOTE", actor, data.resolutionNote ? "Note de résolution" : "Note retirée");
  }

  const updated = await prisma.incident.update({
    where: { id: incident.id },
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
