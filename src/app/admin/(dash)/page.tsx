import IncidentFilters from "@/components/IncidentFilters";
import {
  STATUS_MAP,
  categoryLabel,
  criticalityIcon,
  criticalityLabel,
  isOverdue,
  priorityLabel,
  subIssueLabel,
  ticketTypeIcon,
  ticketTypeLabel,
} from "@/lib/data";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Tickets — Console IT" };
export const dynamic = "force-dynamic";

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

const PAGE_SIZE = 25;

export default async function AdminIncidentsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const status = first(searchParams, "status");
  const category = first(searchParams, "category");
  const roomId = first(searchParams, "roomId");
  const criticality = first(searchParams, "criticality");
  const type = first(searchParams, "type");
  const priority = first(searchParams, "priority");
  const assignedToId = first(searchParams, "assignedToId");
  const overdue = first(searchParams, "overdue");
  const q = first(searchParams, "q");
  const open = first(searchParams, "open");
  const page = Math.max(1, Number(first(searchParams, "page") ?? "1") || 1);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (roomId) where.roomId = roomId;
  if (criticality) where.criticality = criticality;
  if (type) where.type = type;
  if (priority) where.priority = priority;
  if (assignedToId === "none") where.assignedToId = null;
  else if (assignedToId) where.assignedToId = assignedToId;
  if (open === "1") where.status = { in: ["NOUVEAU", "EN_COURS", "EN_ATTENTE"] };
  if (overdue === "1") {
    where.status = { in: ["NOUVEAU", "EN_COURS"] };
    where.dueAt = { lt: new Date() };
  }
  if (q) {
    where.OR = [
      { ticketNumber: { contains: q } },
      { description: { contains: q } },
      { subIssue: { contains: q } },
      { reporterName: { contains: q } },
      { workstationRef: { contains: q } },
      { tags: { contains: q } },
    ];
  }

  const [incidents, total, rooms, allCount, technicians] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: { room: true, equipment: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.incident.count({ where }),
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.incident.count(),
    prisma.adminUser.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageUrl(p: number): string {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string" && v && k !== "page") next.set(k, v);
    }
    next.set("page", String(p));
    return `/admin?${next.toString()}`;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <a
          href="/api/incidents/export"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100"
        >
          ⬇️ Export CSV
        </a>
      </div>

      <Suspense fallback={<p className="mb-4 text-sm text-slate-500">Chargement des filtres…</p>}>
        <IncidentFilters rooms={rooms} technicians={technicians} />
      </Suspense>

      <p className="mb-3 text-sm text-slate-600" aria-live="polite">
        {total} ticket{total > 1 ? "s" : ""}
        {total !== allCount && ` (sur ${allCount} au total)`}
        {pages > 1 && ` — page ${page} / ${pages}`}
      </p>

      {incidents.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
          Aucun ticket ne correspond à ces filtres. 🎉
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">
              Liste des tickets, du plus récent au plus ancien
            </caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="p-3">Ticket</th>
                <th scope="col" className="p-3">Statut</th>
                <th scope="col" className="p-3">Prio.</th>
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
                    <td className="p-3 whitespace-nowrap">
                      <Link
                        href={`/admin/incidents/${i.id}`}
                        className="font-mono font-semibold underline decoration-primary/40 hover:decoration-primary"
                      >
                        {i.ticketNumber}
                      </Link>
                      <span title={ticketTypeLabel(i.type)} className="ml-1">
                        {ticketTypeIcon(i.type)}
                      </span>
                      {i.escalated && <span title="Escaladé"> 🚨</span>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${st?.color ?? ""}`}
                      >
                        {st?.label ?? i.status}
                      </span>
                      {isOverdue(i) && (
                        <span
                          title="Délai cible dépassé pour cette priorité"
                          className="ml-1 inline-block whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
                        >
                          ⏰ En retard
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-xs font-semibold">
                      {priorityLabel(i.priority)}
                      <span className="block font-normal text-slate-500" title={criticalityLabel(i.criticality)}>
                        {criticalityIcon(i.criticality)}
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
                      {i.tags && (
                        <p className="mt-0.5 text-xs">
                          {i.tags.split(",").filter(Boolean).map((t) => (
                            <span key={t} className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                              #{t.trim()}
                            </span>
                          ))}
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

      {pages > 1 && (
        <nav
          aria-label="Pagination des tickets"
          className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm"
        >
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium">
              ← Précédente
            </Link>
          )}
          {Array.from({ length: pages }, (_, idx) => idx + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === pages)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1">…</span>}
                <Link
                  href={pageUrl(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`min-w-[40px] rounded-lg border px-3 py-2 text-center font-medium ${
                    p === page ? "border-primary bg-blue-50" : "border-slate-300 bg-white"
                  }`}
                >
                  {p}
                </Link>
              </span>
            ))}
          {page < pages && (
            <Link href={pageUrl(page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium">
              Suivante →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
