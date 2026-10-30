import { CATEGORIES, isOverdue } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Statistiques — Console IT" };

/** Barre horizontale simple, lisible, sans dépendance de graphique. */
function Bar({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[10rem_1fr_5rem] items-center gap-2 py-1 text-sm">
      <span className="truncate">{label}</span>
      <div
        className="h-4 overflow-hidden rounded bg-slate-100"
        role="presentation"
      >
        <div
          className="h-full rounded bg-primary"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-right font-semibold tabular-nums">
        {Number.isInteger(value) ? value : value.toFixed(1)}
        {suffix ?? ""}
      </span>
    </div>
  );
}

export default async function StatsPage() {
  const incidents = await prisma.incident.findMany({
    include: { room: true, equipment: true },
  });

  const resolved = incidents.filter(
    (i): i is typeof i & { resolvedAt: Date } => i.resolvedAt !== null
  );
  const closed = incidents.filter((i) => i.closedAt !== null);

  // ── MTTR : temps moyen entre création et résolution ──
  const mttrHours = resolved.length
    ? resolved.reduce(
        (acc, i) =>
          acc +
          (i.resolvedAt.getTime() - i.createdAt.getTime()) / 3600_000,
        0
      ) / resolved.length
    : 0;
  const mttrLabel =
    mttrHours >= 24
      ? `${(mttrHours / 24).toFixed(1)} jours`
      : `${mttrHours.toFixed(1)} h`;

  // ── Volume par semaine (8 dernières semaines) ──
  const now = Date.now();
  const weekMs = 7 * 24 * 3600 * 1000;
  const weeks: { label: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = now - (w + 1) * weekMs;
    const end = now - w * weekMs;
    const count = incidents.filter(
      (i) => i.createdAt.getTime() >= start && i.createdAt.getTime() < end
    ).length;
    const d = new Date(end);
    weeks.push({
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      count,
    });
  }
  const maxWeek = Math.max(...weeks.map((w) => w.count), 1);

  // ── Répartition par catégorie ──
  const byCategory = CATEGORIES.map((c) => ({
    key: c.key,
    label: `${c.icon} ${c.label}`,
    count: incidents.filter((i) => i.category === c.key).length,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  // ── Top 5 salles et équipements ──
  function top5<K extends string>(
    map: Map<K, { label: string; count: number }>
  ) {
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }
  const roomMap = new Map<string, { label: string; count: number }>();
  const eqMap = new Map<string, { label: string; count: number }>();
  for (const i of incidents) {
    const r = roomMap.get(i.roomId) ?? { label: i.room.name, count: 0 };
    r.count++;
    roomMap.set(i.roomId, r);
    if (i.equipment) {
      const e = eqMap.get(i.equipmentId ?? "") ?? {
        label: `${i.equipment.name} (${i.room.code})`,
        count: 0,
      };
      e.count++;
      eqMap.set(i.equipmentId ?? "", e);
    }
  }
  const topRooms = top5(roomMap);
  const topEquipment = top5(eqMap);

  const open = incidents.filter(
    (i) =>
      i.status === "NOUVEAU" ||
      i.status === "EN_COURS" ||
      i.status === "EN_ATTENTE"
  ).length;

  // v3 : priorités, temps passé et conformité SLA
  const totalTime = incidents.reduce((acc, i) => acc + i.timeSpent, 0);
  const dueSoon = incidents.filter(
    (i) => i.dueAt && i.status !== "RESOLU" && i.status !== "FERME" && i.dueAt.getTime() > Date.now()
  ).length;

  // v2.1 : retards SLA et satisfaction des déclarants
  const overdue = incidents.filter((i) => isOverdue(i)).length;
  const votes = incidents.filter((i) => i.satisfaction !== null);
  const upVotes = votes.filter((i) => i.satisfaction === 1).length;
  const satisfactionPct = votes.length
    ? `${Math.round((upVotes / votes.length) * 100)} %`
    : "—";

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Statistiques</h1>

      {/* Indicateurs clés */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {(
          [
            { label: "Incidents (total)", value: String(incidents.length) },
            { label: "Ouverts", value: String(open) },
            { label: "Résolus", value: String(resolved.length) },
            { label: "MTTR", value: mttrLabel },
            {
              label: "En retard (SLA)",
              value: String(overdue),
              warn: overdue > 0,
            },
            {
              label: "Satisfaction",
              value: satisfactionPct,
              sub: votes.length ? `${votes.length} vote(s)` : "aucun vote",
            },
          ] as { label: string; value: string; warn?: boolean; sub?: string }[]
        ).map((k) => (
          <div key={k.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {k.label}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                k.warn ? "text-red-600" : "text-primary-dark"
              }`}
            >
              {k.value}
            </p>
            {"sub" in k && k.sub && (
              <p className="text-xs text-slate-500">{k.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="st-semaines"
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 id="st-semaines" className="mb-3 font-semibold">
            📈 Volume par semaine (8 dernières)
          </h2>
          {weeks.map((w) => (
            <Bar key={w.label} label={w.label} value={w.count} max={maxWeek} />
          ))}
        </section>

        <section
          aria-labelledby="st-categorie"
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 id="st-categorie" className="mb-3 font-semibold">
            🧩 Répartition par catégorie
          </h2>
          {byCategory.map((c) => (
            <Bar
              key={c.key}
              label={c.label}
              value={c.count}
              max={byCategory[0]?.count ?? 1}
            />
          ))}
        </section>

        <section
          aria-labelledby="st-salles"
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 id="st-salles" className="mb-3 font-semibold">
            🏆 Top 5 des salles à problème
          </h2>
          {topRooms.map((r) => (
            <Bar key={r.label} label={r.label} value={r.count} max={topRooms[0]?.count ?? 1} />
          ))}
        </section>

        <section
          aria-labelledby="st-equipements"
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 id="st-equipements" className="mb-3 font-semibold">
            🏆 Top 5 des équipements à problème
          </h2>
          {topEquipment.map((e) => (
            <Bar key={e.label} label={e.label} value={e.count} max={topEquipment[0]?.count ?? 1} />
          ))}
        </section>

        <section
          aria-labelledby="st-priorites"
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 id="st-priorites" className="mb-3 font-semibold">
            🎚️ Répartition par priorité
          </h2>
          {(["P1", "P2", "P3", "P4"] as const).map((p) => (
            <Bar
              key={p}
              label={p}
              value={incidents.filter((i) => i.priority === p).length}
              max={Math.max(
                ...(["P1", "P2", "P3", "P4"] as const).map(
                  (x) => incidents.filter((i) => i.priority === x).length
                ),
                1
              )}
            />
          ))}
          <p className="mt-3 text-xs text-slate-500">
            ⏱️ Temps cumulé saisi par les agents :{" "}
            {Math.floor(totalTime / 60)} h {totalTime % 60} min · {dueSoon} ticket(s)
            à échéance SLA imminente ou passée (ouverts).
          </p>
        </section>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        MTTR = temps moyen entre la création et la résolution des{" "}
        {resolved.length} incidents résolus. Fermés : {closed.length}. Les
        données sont purgées après la durée de rétention RGPD (12 mois par
        défaut).
      </p>
    </>
  );
}
