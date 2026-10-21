import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ReportWizard from "@/components/ReportWizard";

export const dynamic = "force-dynamic";

/**
 * Accueil — accès par URL courte (QR "générique" ou saisie manuelle).
 * L'utilisateur choisit sa salle, puis lance l'assistant.
 */
export default async function HomePage() {
  const [rooms, equipment] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ orderBy: { name: "asc" } }),
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

      <section aria-labelledby="titre-suivi" className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
        <h2 id="titre-suivi" className="font-semibold">
          Déjà signalé ? Suivez votre ticket
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Utilisez le lien ou le QR code reçu après votre signalement —{" "}
          aucun compte n&apos;est nécessaire.
        </p>
      </section>

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
