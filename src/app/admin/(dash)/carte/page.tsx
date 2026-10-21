import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Carte des salles — Console IT" };

/**
 * Vue "carte des salles" : code couleur selon le nombre d'incidents
 * OUVERTS (NOUVEAU + EN_COURS) dans chaque salle.
 */
function zone(open: number): { label: string; classes: string } {
  if (open === 0)
    return {
      label: "RAS",
      classes: "bg-green-100 border-green-300 text-green-900",
    };
  if (open <= 2)
    return {
      label: "À surveiller",
      classes: "bg-amber-100 border-amber-300 text-amber-900",
    };
  if (open <= 4)
    return {
      label: "Chargée",
      classes: "bg-orange-100 border-orange-400 text-orange-900",
    };
  return {
    label: "Critique",
    classes: "bg-red-100 border-red-400 text-red-900",
  };
}

export default async function RoomMapPage() {
  const [rooms, incidents] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.incident.findMany({
      where: { status: { in: ["NOUVEAU", "EN_COURS"] } },
      include: { room: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const openByRoom = new Map<string, number>();
  const totalByRoom = new Map<string, number>();
  const latestByRoom = new Map<string, Date>();
  for (const i of incidents) {
    openByRoom.set(i.roomId, (openByRoom.get(i.roomId) ?? 0) + 1);
  }
  const all = await prisma.incident.groupBy({
    by: ["roomId"],
    _count: { _all: true },
  });
  for (const g of all) totalByRoom.set(g.roomId, g._count._all);
  for (const i of incidents) {
    if (!latestByRoom.has(i.roomId)) latestByRoom.set(i.roomId, i.createdAt);
  }

  // Grouper par bâtiment pour une lecture rapide sur le terrain
  const byBuilding = new Map<string, typeof rooms>();
  for (const r of rooms) {
    const b = r.building ?? "Autre";
    byBuilding.set(b, [...(byBuilding.get(b) ?? []), r]);
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Carte des salles</h1>
      <p className="mb-6 text-sm text-slate-600">
        Code couleur selon le nombre d&apos;incidents encore ouverts (nouveau
        + en cours) par salle.
      </p>

      <div className="grid grid-cols-1 gap-6">
        {[...byBuilding.entries()].map(([building, roomList]) => (
          <section key={building} aria-labelledby={`b-${building}`}>
            <h2
              id={`b-${building}`}
              className="mb-3 font-semibold text-slate-700"
            >
              🏢 {building}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roomList.map((r) => {
                const open = openByRoom.get(r.id) ?? 0;
                const z = zone(open);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin?roomId=${r.id}&open=1`}
                      className={`block rounded-xl border-2 p-4 transition hover:shadow-md ${z.classes}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold">{r.name}</span>
                        <span
                          className="rounded-full bg-white/60 px-2 py-0.5 text-sm font-bold"
                          aria-hidden="false"
                        >
                          {open} ouvert{open > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">
                        {z.label} · {totalByRoom.get(r.id) ?? 0} incident
                        {(totalByRoom.get(r.id) ?? 0) > 1 ? "s" : ""} au total
                      </p>
                      {latestByRoom.get(r.id) && (
                        <p className="text-xs opacity-80">
                          Dernier :{" "}
                          {latestByRoom
                            .get(r.id)!
                            .toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </p>
                      )}
                      <p className="mt-2 text-xs underline">
                        Voir les incidents de cette salle →
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Légende : 🟢 RAS (0 ouvert) · 🟡 À surveiller (1-2) · 🟠 Chargée (3-4)
        · 🔴 Critique (5+)
      </p>
    </>
  );
}
