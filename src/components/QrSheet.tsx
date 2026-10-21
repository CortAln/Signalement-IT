"use client";

import type { Room, Equipment } from "@prisma/client";
import { useMemo, useState } from "react";

interface Props {
  rooms: Room[];
  equipment: Equipment[];
  baseUrl: string;
}

/**
 * Feuille d'étiquettes QR imprimable (A4).
 * Chaque étiquette : QR code + libellé salle + code équipement + mini-mode d'emploi.
 * Le QR code est rendu par /api/qr (SVG, cache immuable).
 */
export default function QrSheet({ rooms, equipment, baseUrl }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const sheets = useMemo(
    () =>
      rooms
        .filter((r) => selected.includes(r.id))
        .map((room) => ({
          room,
          equipment: equipment.filter((e) => e.roomId === room.id),
        })),
    [rooms, equipment, selected]
  );

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function selectAll() {
    setSelected(rooms.map((r) => r.id));
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard indisponible : ignorer */
    }
  }

  const qrUrl = (path: string) => `/api/qr?url=${encodeURIComponent(path)}`;

  return (
    <>
      {/* Panneau de sélection (non imprimé) */}
      <div className="no-print mt-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Sélectionnez les salles à imprimer</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              Tout sélectionner
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              Tout désélectionner
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={selected.length === 0}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              🖨️ Imprimer ({selected.length})
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {rooms.map((r) => (
            <label
              key={r.id}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                selected.includes(r.id)
                  ? "border-primary bg-blue-50 ring-2 ring-primary"
                  : "border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                onChange={() => toggle(r.id)}
                className="h-4 w-4"
              />
              {r.name}
            </label>
          ))}
        </div>
      </div>

      {/* Feuilles A4 imprimables */}
      {sheets.map(({ room, equipment: eqs }) => (
        <div key={room.id} className="qr-sheet mt-6 rounded-xl bg-white p-8 shadow-sm print:shadow-none">
          <h2 className="text-xl font-bold">
            {room.name} <span className="text-sm font-normal text-slate-500">({room.code})</span>
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* QR générique de la salle */}
            <div className="qr-label rounded-lg border-2 border-slate-300 p-3 text-center">
              <p className="mb-2 text-sm font-bold">📍 {room.name}</p>
              <img
                src={qrUrl(`/r?salle=${room.code}`)}
                alt={`QR code générique de la salle ${room.name}`}
                className="mx-auto h-28 w-28"
                width={112}
                height={112}
              />
              <p className="mt-2 text-xs text-slate-600">
                Problème de salle ? Scannez ce code.
              </p>
            </div>
            {/* QR par équipement */}
            {eqs.map((e) => {
              const url = `${baseUrl}/r?salle=${room.code}&eq=${e.code}`;
              return (
                <div
                  key={e.id}
                  className="qr-label rounded-lg border-2 border-slate-300 p-3 text-center"
                >
                  <p className="mb-2 text-sm font-bold">{e.name}</p>
                  <img
                    src={qrUrl(`/r?salle=${room.code}&eq=${e.code}`)}
                    alt={`QR code de l'équipement ${e.name} (${e.code})`}
                    className="mx-auto h-28 w-28"
                    width={112}
                    height={112}
                  />
                  <p className="mt-2 font-mono text-xs text-slate-600">{e.code}</p>
                  <button
                    type="button"
                    onClick={() => copyUrl(url)}
                    className="no-print mt-1 text-[10px] underline"
                  >
                    {copied === url ? "Copié ✓" : "copier l'URL"}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-6 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
            📱 Un problème ? Scannez le QR du poste — signalement en 30 secondes,
            sans compte.
          </p>
        </div>
      ))}
    </>
  );
}
