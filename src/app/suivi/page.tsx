import TrackLookup from "@/components/TrackLookup";
import Link from "next/link";

export const metadata = {
  title: "Suivre mon ticket — Signalement IT",
  description: "Suivez l'avancement de votre signalement IT sans compte.",
};

export default function SuiviPage() {
  return (
    <main id="contenu" className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-8">
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
          🎫
        </div>
        <h1 className="text-2xl font-bold">Suivre mon ticket</h1>
        <p className="mt-2 text-slate-600">
          Collez le lien de suivi reçu après votre signalement (ou scannez le
          QR code imprimé). Aucun compte requis.
        </p>
      </header>

      <section
        aria-labelledby="titre-suivi-form"
        className="mt-8 rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 id="titre-suivi-form" className="sr-only">
          Recherche de ticket
        </h2>
        <TrackLookup />
      </section>

      <section className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Où trouver mon jeton ?</p>
        <p className="mt-2">
          À la fin de votre signalement, un écran de confirmation vous a donné
          un lien et un QR code. Le lien ressemble à{" "}
          <span className="font-mono">…/t/AbCdEfGh123…</span> : tout ce qui
          suit <span className="font-mono">/t/</span> est votre jeton.
        </p>
        <p className="mt-2">
          Perdu votre jeton ?{" "}
          <Link href="/" className="font-medium text-primary underline">
            Signalez à nouveau le problème
          </Link>{" "}
          en mentionnant le numéro du ticket (l&apos;équipe IT regroupera les
          deux).
        </p>
      </section>

      <footer className="mt-12 text-center text-xs text-slate-500">
        <p>
          <Link href="/" className="underline">Signaler un problème</Link>
          {" · "}
          <Link href="/kb" className="underline">Base de connaissances</Link>
        </p>
      </footer>
    </main>
  );
}
