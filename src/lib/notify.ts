import { categoryLabel, criticalityIcon, criticalityLabel } from "@/lib/data";
import type { Incident, Room, Equipment } from "@prisma/client";
import nodemailer from "nodemailer";

export type IncidentWithRefs = Incident & {
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

// ── Notifications agent & déclarant (v3, façon helpdesk) ───────────

type Transporter = ReturnType<typeof nodemailer.createTransport>;

/** Transporteur SMTP partagé, ou null si le SMTP n'est pas configuré. */
function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

/**
 * Prévient le technicien fraîchement assigné (email de son compte).
 * Silencieusement ignoré si SMTP absent ou email manquant.
 */
export async function notifyAssignment(
  incident: IncidentWithRefs,
  tech: { email: string; name: string }
) {
  const transporter = getTransporter();
  if (!transporter) return;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "signalement-it@localhost",
      to: tech.email,
      subject: `👤 [${incident.ticketNumber}] vous est assigné`,
      text: `Bonjour ${tech.name},\n\nLe ticket ${incident.ticketNumber} (${describe(incident)})\nvous a été assigné.\n\nConsole : ${base}/admin/incidents/${incident.id}\n`,
    });
  } catch (err) {
    console.error("notifyAssignment: échec d'envoi", err);
  }
}

/**
 * Informe le déclarant d'un changement de statut de son ticket
 * (email facultatif fourni au signalement). Silencieux sinon.
 */
export async function notifyRequester(
  incident: IncidentWithRefs,
  subject: string,
  message: string
) {
  if (!incident.reporterEmail) return;
  const transporter = getTransporter();
  if (!transporter) return;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "signalement-it@localhost",
      to: incident.reporterEmail,
      subject: `[${incident.ticketNumber}] ${subject}`,
      text: `${message}\n\nSuivi de votre signalement : ${base}/t/${incident.token}\n\n(Si vous n'êtes pas à l'origine de ce signalement, ignorez ce message.)`,
    });
  } catch (err) {
    console.error("notifyRequester: échec d'envoi", err);
  }
}
