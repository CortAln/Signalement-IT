"use client";

import { CATEGORIES, CRITICALITIES, STATUSES } from "@/lib/data";
import type { Room } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Barre de filtres de la console admin. Le filtrage se fait via les
 * query params : une recherche est partageable et reste accessible
 * sans JavaScript pour l'essentiel (lien "Réinitialiser").
 */
export default function IncidentFilters({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin?${next.toString()}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    update("q", q.trim() || null);
  }

  const selectClass =
    "min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm";

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Filtrer les incidents"
      className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6"
    >
      <div className="col-span-2 md:col-span-2">
        <label htmlFor="q" className="sr-only">
          Recherche plein texte (ticket, description, équipement, poste…)
        </label>
        <input
          id="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Ticket, description, poste…"
          className={`${selectClass} w-full`}
        />
      </div>
      <div>
        <label htmlFor="f-status" className="sr-only">
          Statut
        </label>
        <select
          id="f-status"
          className={`${selectClass} w-full`}
          value={params.get("status") ?? (params.get("open") === "1" ? "OPEN" : "")}
          onChange={(e) => {
            const v = e.target.value;
            const next = new URLSearchParams(params.toString());
            next.delete("open");
            if (v === "OPEN") {
              next.set("open", "1");
              next.delete("status");
            } else if (v) next.set("status", v);
            else next.delete("status");
            router.push(`/admin?${next.toString()}`);
          }}
        >
          <option value="">Tous statuts</option>
          <option value="OPEN">⚠️ Ouverts uniquement</option>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-cat" className="sr-only">
          Catégorie
        </label>
        <select
          id="f-cat"
          className={`${selectClass} w-full`}
          value={params.get("category") ?? ""}
          onChange={(e) => update("category", e.target.value || null)}
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-room" className="sr-only">
          Salle
        </label>
        <select
          id="f-room"
          className={`${selectClass} w-full`}
          value={params.get("roomId") ?? ""}
          onChange={(e) => update("roomId", e.target.value || null)}
        >
          <option value="">Toutes salles</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-crit" className="sr-only">
          Criticité
        </label>
        <select
          id="f-crit"
          className={`${selectClass} w-full`}
          value={params.get("criticality") ?? ""}
          onChange={(e) => update("criticality", e.target.value || null)}
        >
          <option value="">Toutes criticités</option>
          {CRITICALITIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="col-span-2 min-h-[40px] rounded-lg bg-primary px-4 text-sm font-semibold text-white md:col-span-1"
      >
        Rechercher
      </button>
      <button
        type="button"
        onClick={() => {
          setQ("");
          router.push("/admin");
        }}
        className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium"
      >
        Réinitialiser
      </button>
    </form>
  );
}
