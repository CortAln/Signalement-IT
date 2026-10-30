import { prisma } from "@/lib/prisma";
import {
  STATUS_MAP,
  categoryLabel,
  criticalityIcon,
  isOverdue,
  subIssueLabel,
  statusLabel,
  priorityLabel,
  ticketTypeIcon,
} from "@/lib/data";
import Link from "next/link";

export const metadata = { title: "Tableau de bord — Console IT" };
export const dynamic = "force-dynamic";

const dateFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function Kpi({
  label,
  value,
  warn,
  href,
  sub,
}: {
  label: string;
  value: string;
  warn?: boolean;
  href?: string;
  sub?: string;
}) {
  const inner = (
    <div
      className={`rounded-xl bg-white p-4 shadow-sm ${href ? "hover:shadow-md" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-bold ${warn ? "text-red-600" : "text-primary-dark"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Bar({
  label,
  value,
  max,
  suffix,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[11rem_1fr_4.5rem] items-center gap-2 py-1 text-sm">
      <span className="truncate">{label}</span>
      <div className="h-4 overflow-hidden rounded bg-slate-100" role="presentation">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} aria-hidden="true" />
      </div>
      <span className="text-right font-semibold tabular-nums">
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [incidents, technicians, unassignedCount] = await Promise.all([
    prisma.incident.findMany({
      include: { room: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.adminUser.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.incident.count({
      where: { assignedToId: null, status: { in: ["NOUVEAU", "EN_COURS"] } },
    }),
  ]);

  const open = incidents.filter(
    (i) => i.status === "NOUVEAU" || i.status === "EN_COURS" || i.status === "EN_ATTENTE"
  );
  const overdue = incidents.filter((i) => isOverdue(i));
  const escalated = open.filter((i) => i.escalated);
  const createdThisWeek = incidents.filter((i) => i.createdAt >= since).length;
  const resolvedThisWeek = incidents.filter(
    (i) => i.resolvedAt !== null && i.resolvedAt >= since
  ).length;

  const resolved = incidents.filter((i) => i.resolvedAt !== null);
  const mttrHours = resolved.length
    ? resolved.reduce(
        (acc, i) => acc + ((i.resolvedAt as Date).getTime() - i.createdAt.getTime()) / 3600_000,
        0
      ) / resolved.length
    : 0;
  const mttrLabel =
    mttrHours >= 24 ? `${(mttrHours / 24).toFixed(1)} j` : `${mttrHours.toFixed(1)} h`;

  const withFr = incidents.filter((i) => i.firstResponseAt !== null);
  const frHours = withFr.length
    ? withFr.reduce(
        (acc, i) =>
          acc +
          ((i.firstResponseAt as Date).getTime() - i.createdAt.getTime()) / 3600_000,
        0
      ) / withFr.length
    : 0;

  const votes = incidents.filter((i) => i.satisfaction !== null);
  const upVotes = votes.filter((i) => i.satisfaction === 1).length;
  const satisfactionPct = votes.length
    ? `${Math.round((upVotes / votes.length) * 100)} %`
    : "—";

  // Volume des 14 derniers jours
  const now = Date.now();
  const days: { label: string; count: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    const start = now - (d + 1) * 24 * 3600 * 1000;
    const end = now - d * 24 * 3600 * 1000;
    const count = incidents.filter(
      (i) => i.createdAt.getTime() >= start && i.createdAt.getTime() < end
    ).length;
    days.push({
      label: new Date(end).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      count,
    });
  }
  const maxDay = Math.max(...days.map((d) => d.count), 1);

  // Charge par technicien (tickets ouverts assignés)
  const byTech = technicians
    .map((t) => ({
      label: t.name,
      count: open.filter((i) => i.assignedToId === t.id).length,
    }))
    .sort((a, b) => b.count - a.count);
  const maxTech = Math.max(...byTech.map((t) => t.count), 1);

  // Répartition par statut
  const byStatus = ["NOUVEAU", "EN_COURS", "EN_ATTENTE", "RESOLU", "FERME"].map((s) => ({
    key: s,
    label: statusLabel(s),
    count: incidents.filter((i) => i.status === s).length,
  }));

  const recent = incidents.slice(0, 8);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-slate-500">
          Mise à jour en direct · {incidents.length} ticket(s) au total
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Ouverts" value={String(open.length)} href="/admin?open=1" />
        <Kpi label="Non assignés" value={String(unassignedCount)} href="/admin?assignedToId=none&open=1" sub="à trier" />
        <Kpi
          label="En retard SLA"
          value={String(overdue.length)}
          warn={overdue.length > 0}
          href="/admin?overdue=1"
        />
        <Kpi label="Escaladés" value={String(escalated.length)} warn={escalated.length > 0} sub="ouverts" />
        <Kpi label="Créés (7 j)" value={String(createdThisWeek)} />
        <Kpi label="Résolus (7 j)" value={String(resolvedThisWeek)} />
        <Kpi label="MTTR" value={mttrLabel} sub="résolution moyenne" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="db-jours" className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 id="db-jours" className="mb-3 font-semibold">
            📈 Volume — 14 derniers jours
          </h2>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
            role="presentation"
          >
            {days.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-1" title={`${d.label} : ${d.count}`}>
                <div className="flex h-24 w-full items-end">
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${Math.max(3, Math.round((d.count / maxDay) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="db-statuts" className="rounded-xl bg-white p-5 shadow-sm">
          <h2 id="db-statuts" className="mb-3 font-semibold">
            🎛️ Répartition par statut
          </h2>
          {byStatus.map((s) => (
            <Bar
              key={s.key}
              label={s.label}
              value={s.count}
              max={Math.max(...byStatus.map((x) => x.count), 1)}
              color={s.key === "EN_ATTENTE" ? "bg-purple-400" : "bg-primary"}
            />
          ))}
        </section>

        <section aria-labelledby="db-techs" className="rounded-xl bg-white p-5 shadow-sm">
          <h2 id="db-techs" className="mb-3 font-semibold">
            👥 Charge par technicien (tickets ouverts)
          </h2>
          {byTech.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun agent actif.</p>
          ) : (
            byTech.map((t) => (
              <Bar key={t.label} label={t.label} value={t.count} max={maxTech} />
            ))
          )}
          <p className="mt-2 text-xs text-slate-500">
            Temps de première réponse moyen :{" "}
            {frHours >= 24 ? `${(frHours / 24).toFixed(1)} j` : `${frHours.toFixed(1)} h`} ·
            Satisfaction déclarants : {satisfactionPct}
          </p>
        </section>

        <section aria-labelledby="db-recents" className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="db-recents" className="font-semibold">
              🕒 Derniers tickets</h2>
            <Link href="/admin" className="text-sm font-semibold text-primary underline">
              Tous les tickets →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((i) => {
              const st = STATUS_MAP[i.status];
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <Link
                    href={`/admin/incidents/${i.id}`}
                    className="font-mono font-semibold text-primary underline"
                  >
                    {i.ticketNumber}
                  </Link>
                  <span title={i.type}>{ticketTypeIcon(i.type)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st?.color ?? ""}`}>
                    {st?.label ?? i.status}
                  </span>
                  <span className="text-xs text-slate-500">{priorityLabel(i.priority)}</span>
                  {isOverdue(i) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                      ⏰ Retard
                    </span>
                  )}
                  <span className="flex-1 truncate">
                    {criticalityIcon(i.criticality)} {categoryLabel(i.category)}
                    {subIssueLabel(i.category, i.subIssue) ? ` — ${subIssueLabel(i.category, i.subIssue)}` : ""}{" "}
                    <span className="text-slate-500">· {i.room.name}</span>
                  </span>
                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {i.assignedTo?.name ?? "—"} · {dateFr(i.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
