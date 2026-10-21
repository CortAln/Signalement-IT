"use client";

import { useState } from "react";

/**
 * Boutons 👍 / 👎 affichés sur la page de suivi publique quand le
 * signalement est résolu. Authentifié par le jeton, sans compte.
 */
export default function FeedbackButtons({
  token,
  satisfaction,
}: {
  token: string;
  satisfaction: number | null;
}) {
  const [state, setState] = useState<number | null>(satisfaction);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vote(value: 1 | -1) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/incidents/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Envoi impossible");
      }
      setState(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  if (state !== null) {
    return (
      <p className="mt-6 rounded-2xl bg-green-50 p-4 text-center text-sm text-green-800">
        {state === 1 ? "👍 Merci ! Ravi que ce soit réglé." : "👎 Noté, merci — votre retour aide l'équipe à prioriser."}
      </p>
    );
  }

  return (
    <section
      aria-labelledby="titre-avis"
      className="mt-6 rounded-2xl bg-white p-5 text-center shadow-sm"
    >
      <h2 id="titre-avis" className="font-semibold">
        C&apos;est résolu pour vous ?
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Votre avis aide l&apos;équipe à améliorer le service.
      </p>
      <div className="mt-3 flex justify-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => vote(1)}
          className="min-h-[52px] flex-1 max-w-[160px] rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          👍 Oui !
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => vote(-1)}
          className="min-h-[52px] flex-1 max-w-[160px] rounded-xl border-2 border-slate-300 px-4 font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          👎 Non
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
