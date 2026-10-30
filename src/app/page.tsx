import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ReportWizard from "@/components/ReportWizard";

export const dynamic = "force-dynamic";

/**
 * Accueil — accès par URL courte (QR "générique" ou saisie manuelle).
 * Trois entrées : signaler, suivre un ticket, base de connaissances.
 */
export default async function HomePage() {
  const [rooms, equipment, kbCount] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ orderBy: { name: "asc" } }),
    prisma.knowledgeArticle
      .count({ where: { published: true } })
      .catch(() => 0),
  ]);

  return (
    <main id="contenu" className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-8">
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
          🛠️
        </div>
        <h1 className="text-2xl font-bold">Un problème informatique ?</h1>
        <p className="mt-2 text-slate-600">
          Signalez-le en moins de 30 secondes. Pas besoin de compte, pas de
          mot de passe : quelques touches et l&apos;équipe IT est prévenue.
        </p>
      </header>

      <section aria-labelledby="titre-choix-lieu" className="mt-8">
        <h2 id="titre-choix-lieu" className="mb-3 font-semibold">
          1. Où êtes-vous ?
        </h2>
        <ReportWizard
          rooms={rooms}
          equipment={equipment}
          initialRoom={null}
          initialEquipment={null}
        />
      </section>

      <nav
        aria-label="Autres actions"
        className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Link
          href="/suivi"
          className="block rounded-2xl bg-white p-5 shadow-sm hover:shadow-md"
        >
          <p className="text-2xl" aria-hidden="true">🎫</p>
          <h2 className="mt-1 font-semibold">Suivre un ticket</h2>
          <p className="mt-1 text-sm text-slate-600">
            Déjà signalé ? Suivez l&apos;avancement avec votre lien de suivi.
          </p>
        </Link>
        <Link
          href="/kb"
          className="block rounded-2xl bg-white p-5 shadow-sm hover:shadow-md"
        >
          <p className="text-2xl" aria-hidden="true">💡</p>
          <h2 className="mt-1 font-semibold">Base de connaissances</h2>
          <p className="mt-1 text-sm text-slate-600">
            {kbCount > 0
              ? `${kbCount} article${kbCount > 1 ? "s" : ""} pour se dépanner soi-même.`
              : "Des solutions simples pour se dépanner soi-même."}
          </p>
        </Link>
      </nav>

      <footer className="mt-12 text-center text-xs text-slate-500">
        <p>
          Vos données (nom, email, photos) sont facultatives, utilisées
          uniquement pour traiter votre signalement et supprimées au bout de
          12 mois (RGPD).
        </p>
        <p className="mt-2">
          <Link href="/admin/login" className="underline">
            Espace support IT
          </Link>
        </p>
      </footer>
    </main>
  );
}
