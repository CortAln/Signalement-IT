import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ReportWizard from "@/components/ReportWizard";

/**
 * /r?salle=[code]&eq=[code-équipement] — cible des QR codes collés
 * sur les postes / écrans / salles.
 * La localisation et l'équipement sont pré-remplis automatiquement.
 * QR "générique" de salle : /r?salle=BASTIDE (sans eq).
 */
export default async function QRPage({
  searchParams,
}: {
  searchParams: { salle?: string; eq?: string };
}) {
  const { salle, eq } = searchParams;
  if (!salle) redirect("/");

  const room = await prisma.room.findUnique({ where: { code: salle } });
  const equipment = eq
    ? await prisma.equipment.findUnique({ where: { code: eq }, include: { room: true } })
    : null;

  // Si l'équipement existe, il est prioritaire (QR collé sur l'équipement).
  const effectiveRoom = equipment?.room ?? room;

  if (!effectiveRoom) {
    return (
      <main id="contenu" className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-xl font-bold">Salle inconnue</h1>
        <p className="mt-2 text-slate-600">
          Le QR code ne correspond à aucune salle enregistrée. Il a peut-être été
          mal imprimé ou collé au mauvais endroit — merci de le signaler au
          support IT.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-white"
        >
          Faire un signalement quand même
        </a>
      </main>
    );
  }

  const rooms = await prisma.room.findMany({ orderBy: { name: "asc" } });
  const equipmentAll = await prisma.equipment.findMany({ orderBy: { name: "asc" } });

  return (
    <main id="contenu" className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-6">
      <header className="rounded-2xl bg-primary-dark p-5 text-white">
        <p className="text-sm opacity-80">📍 Signalement rapide</p>
        <h1 className="text-2xl font-bold">{effectiveRoom.name}</h1>
        {equipment ? (
          <p className="mt-1 text-sm opacity-90">
            Équipement : {equipment.name} ({equipment.code})
          </p>
        ) : (
          <p className="mt-1 text-sm opacity-90">
            Sélectionnez l&apos;équipement concerné à l&apos;étape suivante si besoin.
          </p>
        )}
      </header>

      <section aria-label="Assistant de signalement" className="mt-6">
        <ReportWizard
          rooms={rooms}
          equipment={equipmentAll}
          initialRoom={effectiveRoom}
          initialEquipment={equipment}
        />
      </section>

      <footer className="mt-12 text-center text-xs text-slate-500">
        <p>
          Données facultatives, usage limité au traitement du signalement,
          suppression après 12 mois (RGPD).
        </p>
      </footer>
    </main>
  );
}
