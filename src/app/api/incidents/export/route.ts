import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { criticalityLabel, statusLabel, categoryLabel, subIssueLabel } from "@/lib/data";

/**
 * GET /api/incidents/export — export CSV complet (réservé admin).
 * Encodage UTF-8 avec BOM pour un ouvert correct dans Excel.
 */
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return new Response("Non autorisé", { status: 401 });
  }

  const incidents = await prisma.incident.findMany({
    include: { room: true, equipment: true, assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Numéro",
    "Statut",
    "Criticité",
    "Catégorie",
    "Sous-question",
    "Description",
    "Salle",
    "Équipement",
    "Technicien assigné",
    "Signalé par",
    "Email",
    "Référence poste/badge",
    "Créé le",
    "Résolu le",
    "Fermé le",
  ];

  const rows = incidents.map((i) =>
    [
      i.ticketNumber,
      statusLabel(i.status),
      criticalityLabel(i.criticality),
      categoryLabel(i.category),
      subIssueLabel(i.category, i.subIssue),
      i.description,
      i.room.name,
      i.equipment?.name,
      i.assignedTo?.name,
      i.reporterName,
      i.reporterEmail,
      i.workstationRef,
      i.createdAt.toISOString(),
      i.resolvedAt?.toISOString() ?? "",
      i.closedAt?.toISOString() ?? "",
    ]
      .map(csvCell)
      .join(";")
  );

  const csv = "\uFEFF" + header.map(csvCell).join(";") + "\r\n" + rows.join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="incidents-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
