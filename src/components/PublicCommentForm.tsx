"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Formulaire public (page de suivi /t/<token>) : le déclarant peut
 * ajouter une précision sans compte. Si le ticket était EN_ATTENTE,
 * il repasse EN_COURS côté serveur.
 */
export default function PublicCommentForm({
  token,
  reporterName,
}: {
  token: string;
  reporterName: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Envoi impossible.");
      }
      setBody("");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="titre-repondre">
      <h2 id="titre-repondre" className="mb-3 font-semibold">
        Ajouter une précision
      </h2>
      <p className="mb-2 text-sm text-slate-600">
        {reporterName ? `Connecté en tant que ${reporterName}. ` : ""}
        L&apos;équipe IT verra votre message immédiatement.
      </p>
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ex. : le problème revient surtout le matin, voici une photo…"
        className="w-full rounded-lg border border-slate-300 p-3 text-sm"
        maxLength={2000}
      />
      <button
        type="submit"
        disabled={busy || !body.trim()}
        className="mt-2 min-h-[48px] w-full rounded-lg bg-primary px-4 font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Envoi…" : "Envoyer à l'équipe IT"}
      </button>
      {done && (
        <p role="status" className="mt-2 rounded-lg bg-green-100 p-2 text-sm text-green-800">
          ✅ Message transmis. L&apos;équipe IT a été notifiée.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-100 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
