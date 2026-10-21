import IncidentFilters from "@/components/IncidentFilters";
import {
  STATUS_MAP,
  categoryLabel,
  criticalityIcon,
  criticalityLabel,
  isOverdue,
  subIssueLabel,
} from "@/lib/data";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Incidents — Console IT" };

type Params = { [key: string]: string | string[] | undefined };

function first(p: Params, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" && v ? v : undefined;
}

const dateFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function AdminIncidentsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const status = first(searchParams, "status");
  const category = first(searchParams, "category");
  const roomId = first(searchParams, "roomId");
  const criticality = first(searchParams, "criticality");
  const q = first(searchParams, "q");
  const open = first(searchParams, "open");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (roomId) where.roomId = roomId;
  if (criticality) where.criticality = criticality;
  if (open === "1") where.status = { in: ["NOUVEAU", "EN_COURS"] };
  if (q) {
    where.OR = [
      { ticketNumber: { contains: q } },
      { description: { contains: q } },
      { subIssue: { contains: q } },
      { reporterName: { contains: q } },
      { workstationRef: { contains: q } },
    ];
  }

  const [incidents, rooms, allRooms] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: { room: true, equipment: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.incident.count(),
  ]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Incidents</h1>
        <a
          href="/api/incidents/export"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100"
        >
          ⬇️ Export CSV
        </a>
      </div>

      <Suspense fallback={<p className="mb-4 text-sm text-slate-500">Chargement des filtres…</p>}>
        <IncidentFilters rooms={rooms} />
      </Suspense>

      <p className="mb-3 text-sm text-slate-600" aria-live="polite">
        {incidents.length} incident{incidents.length > 1 ? "s" : ""}
        {incidents.length !== allRooms && ` (sur ${allRooms} au total)`}
      </p>

      {incidents.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
          Aucun incident ne correspond à ces filtres. 🎉
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">
              Liste des incidents, du plus récent au plus ancien
            </caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="p-3">Ticket</th>
                <th scope="col" className="p-3">Statut</th>
                <th scope="col" className="p-3">Criticité</th>
                <th scope="col" className="p-3">Problème</th>
                <th scope="col" className="p-3">Lieu</th>
                <th scope="col" className="p-3">Assigné</th>
                <th scope="col" className="p-3">Créé le</th>
                <th scope="col" className="p-3"><span className="sr-only">Ouvrir</span></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => {
                const st = STATUS_MAP[i.status];
                return (
                  <tr
                    key={i.id}
                    className="border-b border-slate-100 align-top hover:bg-slate-50"
                  >
                    <td className="p-3 font-mono font-semibold whitespace-nowrap">
                      <Link
                        href={`/admin/incidents/${i.id}`}
                        className="underline decoration-primary/40 hover:decoration-primary"
                      >
                        {i.ticketNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${st?.color ?? ""}`}
                      >
                        {st?.label ?? i.status}
                      </span>
                      {isOverdue(i) && (
                        <span
                          title="Délai cible dépassé pour cette criticité"
                          className="ml-1 inline-block whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
                        >
                          ⏰ En retard
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span title={criticalityLabel(i.criticality)}>
                        {criticalityIcon(i.criticality)}{" "}
                        {criticalityLabel(i.criticality)}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs">
                      <span className="font-medium">{categoryLabel(i.category)}</span>
                      {subIssueLabel(i.category, i.subIssue) && (
                        <span className="text-slate-500">
                          {" — "}
                          {subIssueLabel(i.category, i.subIssue)}
                        </span>
                      )}
                      {i.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {i.description}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      {i.room.name}
                      {i.equipment && (
                        <p className="text-xs text-slate-500">{i.equipment.name}</p>
                      )}
                    </td>
                    <td className="p-3">{i.assignedTo?.name ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap text-slate-600">
                      {dateFr(i.createdAt)}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/incidents/${i.id}`}
                        className="font-semibold text-primary underline"
                      >
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
