"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Recherche publique de ticket : l'utilisateur colle son lien de suivi,
 * son jeton, ou son numéro + jeton. Aucun compte requis.
 */
export default function TrackLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function extractToken(raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    // Lien complet /t/<token> ?
    const m = v.match(/\/t\/([A-Za-z0-9_-]{8,})/);
    if (m) return m[1];
    // Jeton seul (base64url)
    if (/^[A-Za-z0-9_-]{16,32}$/.test(v)) return v;
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = extractToken(value);
    if (!token) {
      setError(
        "Jeton non reconnu. Collez le lien de suivi reçu après votre signalement (il ressemble à /t/AbCdEf123…)."
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/incidents/lookup?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        router.push(`/t/${token}`);
      } else {
        setError("Aucun signalement ne correspond à ce jeton.");
      }
    } catch {
      setError("Erreur réseau. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
      <label htmlFor="track-input" className="text-sm font-medium">
        Lien ou jeton de suivi
      </label>
      <input
        id="track-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://…/t/AbCdEf… ou AbCdEf…"
        className="min-h-[48px] rounded-lg border border-slate-300 px-3"
      />
      <button
        type="submit"
        disabled={busy}
        className="min-h-[48px] rounded-lg bg-primary px-4 font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Recherche…" : "Suivre mon ticket"}
      </button>
      {error && (
        <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
