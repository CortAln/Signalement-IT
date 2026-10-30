"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PRIORITIES,
  STATUSES,
  TICKET_TYPES,
  statusLabel,
} from "@/lib/data";

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
  type: string;
  priority: string;
  tags: string;
  timeSpent: number;
  escalated: boolean;
  resolutionNote: string | null;
  readOnly?: boolean; // profil LECTEUR
}

/**
 * Panneau agent : cycle de vie, priorité, type, tags, assignation,
 * temps passé, escalade, note de résolution et commentaires.
 */
export default function IncidentActions({
  incidentId,
  status,
  assignedToId,
  technicians,
  comments,
  type,
  priority,
  tags,
  timeSpent,
  escalated,
  resolutionNote,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(true);
  const [tagInput, setTagInput] = useState(tags);
  const [minutes, setMinutes] = useState("15");
  const [note, setNote] = useState(resolutionNote ?? "");
  const [showNote, setShowNote] = useState(false);

  async function patch(data: Record<string, unknown>) {
    if (readOnly) return;
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
    if (readOnly || !comment.trim()) return;
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

  const selectClass =
    "min-h-[44px] w-full rounded-lg border border-slate-300 px-3 disabled:opacity-60";

  return (
    <div className="grid grid-cols-1 gap-4">
      {readOnly && (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
          👁️ Profil en lecture seule : consultation uniquement.
        </p>
      )}

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
              disabled={busy || readOnly || s.key === status}
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

      {/* Priorité & type */}
      <section aria-labelledby="titre-prio" className="grid grid-cols-1 gap-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 id="titre-prio" className="font-semibold">
          Classification
        </h2>
        <div>
          <label htmlFor="priority" className="mb-1 block text-sm font-medium">
            Priorité
          </label>
          <select
            id="priority"
            className={selectClass}
            value={priority}
            disabled={busy || readOnly}
            onChange={(e) => patch({ priority: e.target.value })}
          >
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            Type de ticket
          </label>
          <select
            id="type"
            className={selectClass}
            value={type}
            disabled={busy || readOnly}
            onChange={(e) => patch({ type: e.target.value })}
          >
            {TICKET_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tags" className="mb-1 block text-sm font-medium">
            Tags (séparés par des virgules)
          </label>
          <div className="flex gap-2">
            <input
              id="tags"
              type="text"
              value={tagInput}
              disabled={busy || readOnly}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="wifi, urgent, fournisseur…"
              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3"
            />
            <button
              type="button"
              disabled={busy || readOnly || tagInput === tags}
              onClick={() => patch({ tags: tagInput })}
              className="min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              OK
            </button>
          </div>
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
          disabled={busy || readOnly}
          onChange={(e) => patch({ assignedToId: e.target.value || null })}
          className={selectClass}
        >
          <option value="">— Non assigné —</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </section>

      {/* Temps passé & escalade */}
      <section
        aria-labelledby="titre-temps"
        className="grid grid-cols-1 gap-3 rounded-xl bg-white p-5 shadow-sm"
      >
        <h2 id="titre-temps" className="font-semibold">
          Charge & escalade
        </h2>
        <p className="text-sm text-slate-600">
          ⏱️ Temps cumulé : <strong>{timeSpent} min</strong>
          {timeSpent >= 60 && ` (${Math.floor(timeSpent / 60)} h ${timeSpent % 60} min)`}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label htmlFor="minutes" className="mb-1 block text-sm font-medium">
              Ajouter du temps (minutes)
            </label>
            <input
              id="minutes"
              type="number"
              min="1"
              max="1440"
              value={minutes}
              disabled={busy || readOnly}
              onChange={(e) => setMinutes(e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
            />
          </div>
          <button
            type="button"
            disabled={busy || readOnly}
            onClick={() => patch({ timeSpent: Number(minutes) || 0 })}
            className="min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Journaliser
          </button>
        </div>
        <button
          type="button"
          disabled={busy || readOnly}
          onClick={() => patch({ escalated: !escalated })}
          className={`min-h-[44px] rounded-lg border px-4 text-sm font-semibold ${
            escalated
              ? "border-red-300 bg-red-100 text-red-800"
              : "border-slate-300 bg-white hover:bg-slate-50"
          } disabled:opacity-40`}
        >
          {escalated ? "🚨 Escaladé — retirer l'escalade" : "🚨 Escalader ce ticket"}
        </button>
      </section>

      {/* Note de résolution */}
      <section aria-labelledby="titre-note" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 id="titre-note" className="mb-3 font-semibold">
          Note de résolution
        </h2>
        {!showNote && (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-sm font-semibold text-primary underline"
          >
            {resolutionNote ? "Modifier la note visible par le déclarant" : "Rédiger une note visible par le déclarant"}
          </button>
        )}
        {showNote && (
          <>
            <textarea
              rows={3}
              value={note}
              disabled={busy || readOnly}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. : câble HDMI remplacé, pensez à sélectionner la source HDMI…"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNote(false)}
                className="min-h-[40px] rounded-lg border border-slate-300 px-4 text-sm font-medium"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={busy || readOnly || !note.trim()}
                onClick={() => patch({ resolutionNote: note })}
                className="min-h-[40px] rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                Enregistrer
              </button>
            </div>
          </>
        )}
        {!showNote && resolutionNote && (
          <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">
            {resolutionNote}
          </p>
        )}
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
            disabled={readOnly}
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
              disabled={busy || readOnly || !comment.trim()}
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
