"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUSES, statusLabel } from "@/lib/data";

interface CommentView {
  id: string;
  authorName: string;
  body: string;
  internal: boolean;
  createdAt: string;
}

interface Props {
  incidentId: string;
  status: string;
  assignedToId: string | null;
  technicians: { id: string; name: string }[];
  comments: CommentView[];
}

/** Cycle de vie, assignation et commentaires (colonne droite de la fiche). */
export default function IncidentActions({
  incidentId,
  status,
  assignedToId,
  technicians,
  comments,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(true);

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Action impossible");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  async function postComment() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, body: comment, internal }),
      });
      setComment("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Cycle de vie */}
      <section aria-labelledby="titre-cycle" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 id="titre-cycle" className="mb-3 font-semibold">
          Cycle de vie
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              disabled={busy || s.key === status}
              onClick={() => patch({ status: s.key })}
              className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium disabled:opacity-40 ${
                s.key === status
                  ? "border-primary bg-blue-50 ring-2 ring-primary"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              {statusLabel(s.key)}
            </button>
          ))}
        </div>
      </section>

      {/* Assignation */}
      <section aria-labelledby="titre-assign" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 id="titre-assign" className="mb-3 font-semibold">
          Assignation
        </h2>
        <label htmlFor="assign" className="sr-only">
          Technicien assigné
        </label>
        <select
          id="assign"
          value={assignedToId ?? ""}
          disabled={busy}
          onChange={(e) => patch({ assignedToId: e.target.value || null })}
          className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
        >
          <option value="">— Non assigné —</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </section>

      {/* Commentaires */}
      <section aria-labelledby="titre-comm" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 id="titre-comm" className="mb-3 font-semibold">
          Commentaires
        </h2>
        {comments.length === 0 && (
          <p className="mb-3 text-sm text-slate-500">Aucun commentaire.</p>
        )}
        <ul className="mb-4 grid grid-cols-1 gap-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg p-3 text-sm ${
                c.internal ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-100"
              }`}
            >
              <p className="font-semibold">
                {c.authorName}{" "}
                {c.internal && (
                  <span className="ml-1 rounded bg-amber-200 px-1.5 text-xs">
                    interne
                  </span>
                )}
                <span className="ml-1 font-normal text-slate-500">
                  {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ul>

        <div>
          <label htmlFor="new-comment" className="mb-1 block text-sm font-medium">
            Nouveau commentaire
          </label>
          <textarea
            id="new-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
                className="h-4 w-4"
              />
              Interne (invisible sur le suivi public)
            </label>
            <button
              type="button"
              disabled={busy || !comment.trim()}
              onClick={postComment}
              className="min-h-[40px] rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              Publier
            </button>
          </div>
          {!internal && (
            <p className="mt-1 text-xs text-slate-500">
              ℹ️ Visible par le déclarant sur sa page de suivi.
            </p>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
