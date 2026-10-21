import ReferentielManager from "@/components/ReferentielManager";
import { requireApiAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = { title: "Salles & équipements — Console IT" };

/**
 * Référentiel : gérer les salles et équipements sans toucher au seed.
 * Les codes sont figés (encodés dans les QR imprimés) — le reste est
 * modifiable. La suppression d'une salle avec incidents est refusée.
 */
export default async function ReferentielPage() {
  const admin = await requireApiAdmin();
  if (!admin) redirect("/admin/login");

  const [rooms, equipment, grouped] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ orderBy: { code: "asc" } }),
    prisma.incident.groupBy({
      by: ["roomId"],
      _count: { _all: true },
    }),
  ]);

  const incidentCounts: Record<string, number> = {};
  for (const g of grouped) incidentCounts[g.roomId] = g._count._all;

  return (
    <>
      <h1 className="text-2xl font-bold">Salles &amp; équipements</h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-slate-600">
        Créez ici les salles et les équipements au fil des déploiements, puis
        générez leurs étiquettes QR. Après création d&apos;une salle, son{" "}
        <strong>code est figé</strong> : il est encodé dans les QR imprimés
        (voir <code className="font-mono text-xs">docs/GUIDE-QR.md</code>).
      </p>
      <ReferentielManager
        rooms={rooms}
        equipment={equipment}
        isAdmin={admin.role === "ADMIN"}
        incidentCounts={incidentCounts}
      />
    </>
  );
}
