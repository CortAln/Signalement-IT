import { categoryLabel, criticalityIcon, criticalityLabel } from "@/lib/data";
import type { Incident, Room, Equipment } from "@prisma/client";
import nodemailer from "nodemailer";

type IncidentWithRefs = Incident & {
  room: Room;
  equipment: Equipment | null;
};

const CRITICALITY_WEIGHT: Record<string, number> = {
  MINEUR: 1,
  GENANT: 2,
  BLOQUANT: 3,
};

function passesFilter(criticality: string, min: string | undefined): boolean {
  if (!min || min === "AUCUNE") return false;
  const w = CRITICALITY_WEIGHT[criticality] ?? 1;
  return w >= (CRITICALITY_WEIGHT[min] ?? 1);
}

function describe(incident: IncidentWithRefs): string {
  const lieu = incident.equipment
    ? `${incident.room.name} — ${incident.equipment.name}`
    : incident.room.name;
  return [
    `${incident.ticketNumber} — ${criticalityIcon(incident.criticality)} ${criticalityLabel(incident.criticality)}`,
    `Catégorie : ${categoryLabel(incident.category)}${incident.subIssue ? ` (${incident.subIssue})` : ""}`,
    `Lieu : ${lieu}`,
    incident.description ? `Description : ${incident.description}` : null,
    incident.reporterName
      ? `Signalé par : ${incident.reporterName}${incident.reporterEmail ? ` (${incident.reporterEmail})` : ""}`
      : "Signalé anonymement",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Envoi d'un email au support IT (silencieusement ignoré si non configuré). */
export async function notifyEmail(incident: IncidentWithRefs) {
  const host = process.env.SMTP_HOST;
  const to = process.env.IT_SUPPORT_EMAIL;
  const min = process.env.EMAIL_MIN_CRITICITE || "GENANT";
  if (!host || !to || !passesFilter(incident.criticality, min)) return;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    const base = process.env.NEXT_PUBLIC_BASE_URL || "";
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "signalement-it@localhost",
      to,
      subject: `[${incident.ticketNumber}] ${criticalityLabel(incident.criticality)} — ${incident.room.name}`,
      text: `${describe(incident)}\n\nSuivi : ${base}/t/${incident.token}\nConsole admin : ${base}/admin/incidents/${incident.id}`,
    });
  } catch (err) {
    console.error("notifyEmail: échec d'envoi", err);
  }
}

/** Webhook générique Teams / Slack (format "Incoming Webhook", texte). */
export async function notifyWebhook(incident: IncidentWithRefs) {
  const url = process.env.WEBHOOK_URL;
  const min = process.env.WEBHOOK_MIN_CRITICITE || "MINEUR";
  if (!url || !passesFilter(incident.criticality, min)) return;

  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const text = `🆕 Nouveau signalement IT\n${describe(incident)}\n\nSuivi : ${base}/t/${incident.token}`;
  // Teams "Workflows" et Slack "incoming webhook" acceptent tous deux { text: "..." }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("notifyWebhook: échec d'envoi", err);
  }
}

export async function notifyNewIncident(incident: IncidentWithRefs) {
  await Promise.allSettled([notifyEmail(incident), notifyWebhook(incident)]);
}
