"use client";

import type { Equipment, Room } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EQUIPMENT_TYPES = [
  "ECRAN",
  "PC",
  "IMPRIMANTE",
  "RESEAU",
  "TELEPHONIE",
  "VIDEOPROJ",
  "LOGICIEL",
  "ELECTRICITE",
  "AUTRE",
];

interface Props {
  rooms: Room[];
  equipment: Equipment[];
  isAdmin: boolean;
  /** Nombre d'incidents rattachés par salle (id → nombre) */
  incidentCounts: Record<string, number>;
}

const input =
  "min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm";

/**
 * Référentiel des salles et équipements : créer, renommer, supprimer.
 * ⚠️ Les codes sont figés après création : ils sont encodés dans les QR
 * codes déjà imprimés (voir docs/GUIDE-QR.md).
 */
export default function ReferentielManager({ rooms, equipment, isAdmin, incidentCounts }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [addEqFor, setAddEqFor] = useState<string | null>(null);

  // Formulaire nouvelle salle
  const [nrCode, setNrCode] = useState("");
  const [nrName, setNrName] = useState("");
  const [nrBuilding, setNrBuilding] = useState("");
  const [nrFloor, setNrFloor] = useState("");

  // Formulaires dynamiques (édition salle / nouvel équipement)
  const [editRoom, setEditRoom] = useState({ name: "", building: "", floor: "" });
  const [eq, setEq] = useState({ code: "", name: "", type: "ECRAN" });

  async function call(url: string, method: string, body?: unknown, okMsg?: string) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action impossible");
      setInfo(okMsg ?? null);
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(
      "/api/rooms",
      "POST",
      {
        code: nrCode,
        name: nrName,
        building: nrBuilding || null,
        floor: nrFloor || null,
      },
      `Salle « ${nrName} » créée. Pensez à imprimer ses étiquettes QR (onglet Étiquettes QR).`
    );
    if (ok) {
      setNrCode("");
      setNrName("");
      setNrBuilding("");
      setNrFloor("");
    }
  }

  async function createEquipment(roomId: string, roomName: string) {
    const ok = await call(
      "/api/equipment",
      "POST",
      { ...eq, roomId },
      `Équipement « ${eq.name} » ajouté à ${roomName}.`
    );
    if (ok) {
      setEq({ code: "", name: "", type: "ECRAN" });
      setAddEqFor(null);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-800">
          {info}
        </p>
      )}

      {/* ── Nouvelle salle ── */}
      <section
        aria-labelledby="titre-new-room"
        className="mb-6 rounded-xl bg-white p-5 shadow-sm"
      >
        <h2 id="titre-new-room" className="mb-1 font-semibold">
          ➕ Ajouter une salle
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Le code (ex. <code className="font-mono">BASTIDE</code>) est figé après
          création : il est encodé dans les QR codes imprimés.
        </p>
        <form onSubmit={createRoom} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <div>
            <label htmlFor="nr-code" className="sr-only">Code (2-20 caractères)</label>
            <input id="nr-code" className={input} placeholder="Code (ex. SALLE07)" required
              minLength={2} maxLength={20} value={nrCode} onChange={(e) => setNrCode(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nr-name" className="sr-only">Nom affiché</label>
            <input id="nr-name" className={input} placeholder="Nom affiché (ex. Salle Réunion 7)" required
              maxLength={100} value={nrName} onChange={(e) => setNrName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="nr-building" className="sr-only">Bâtiment (optionnel)</label>
            <input id="nr-building" className={input} placeholder="Bâtiment (opt.)"
              maxLength={100} value={nrBuilding} onChange={(e) => setNrBuilding(e.target.value)} />
          </div>
          <div>
            <label htmlFor="nr-floor" className="sr-only">Étage (optionnel)</label>
            <input id="nr-floor" className={input} placeholder="Étage (opt.)"
              maxLength={20} value={nrFloor} onChange={(e) => setNrFloor(e.target.value)} />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-5"
          >
            Créer la salle
          </button>
        </form>
      </section>

      {/* ── Salles existantes ── */}
      <div className="grid grid-cols-1 gap-4">
        {rooms.map((room) => {
          const eqs = equipment.filter((e) => e.roomId === room.id);
          const incCount = incidentCounts[room.id] ?? 0;
          return (
            <section
              key={room.id}
              aria-labelledby={`room-${room.code}`}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 id={`room-${room.code}`} className="font-bold">
                    {room.name}{" "}
                    <span className="font-mono text-sm font-normal text-slate-500">
                      ({room.code})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {room.building ?? "—"} {room.floor ? `· étage ${room.floor}` : ""}
                    {" · "}
                    {eqs.length} équipement(s) · {incCount} incident(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoom(editingRoom === room.id ? null : room.id);
                      setEditRoom({
                        name: room.name,
                        building: room.building ?? "",
                        floor: room.floor ?? "",
                      });
                    }}
                    className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-sm"
                  >
                    {editingRoom === room.id ? "Annuler" : "✏️ Modifier"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddEqFor(addEqFor === room.id ? null : room.id);
                      setEq({ code: "", name: "", type: "ECRAN" });
                    }}
                    className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-sm"
                  >
                    {addEqFor === room.id ? "Annuler" : "➕ Équipement"}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={busy || incCount > 0}
                      title={
                        incCount > 0
                          ? "Des incidents sont rattachés : suppression impossible"
                          : "Supprimer la salle et ses équipements sans incidents"
                      }
                      onClick={() => call(`/api/rooms/${room.id}`, "DELETE", undefined, `Salle « ${room.name} » supprimée.`)}
                      className="min-h-[36px] rounded-lg border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Édition salle */}
              {editingRoom === room.id && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await call(
                      `/api/rooms/${room.id}`,
                      "PATCH",
                      { name: editRoom.name, building: editRoom.building || null, floor: editRoom.floor || null },
                      "Salle mise à jour."
                    );
                    if (ok) setEditingRoom(null);
                  }}
                  className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4"
                >
                  <div>
                    <label htmlFor={`er-name-${room.code}`} className="sr-only">Nom</label>
                    <input id={`er-name-${room.code}`} className={input} required maxLength={100}
                      value={editRoom.name} onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`er-b-${room.code}`} className="sr-only">Bâtiment</label>
                    <input id={`er-b-${room.code}`} className={input} maxLength={100}
                      value={editRoom.building} onChange={(e) => setEditRoom({ ...editRoom, building: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`er-f-${room.code}`} className="sr-only">Étage</label>
                    <input id={`er-f-${room.code}`} className={input} maxLength={20}
                      value={editRoom.floor} onChange={(e) => setEditRoom({ ...editRoom, floor: e.target.value })} />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Enregistrer
                  </button>
                </form>
              )}

              {/* Équipements */}
              {eqs.length > 0 ? (
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {eqs.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                      <div>
                        <p className="font-medium">{e.name}</p>
                        <p className="font-mono text-xs text-slate-500">{e.code}</p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => call(`/api/equipment/${e.id}`, "DELETE", undefined, `Équipement « ${e.name} » supprimé (les incidents liés gardent leur historique).`)}
                          className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
                          aria-label={`Supprimer l'équipement ${e.name}`}
                        >
                          🗑️
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Aucun équipement enregistré — ajoutez-en pour générer des QR codes individuels.
                </p>
              )}

              {/* Nouvel équipement */}
              {addEqFor === room.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createEquipment(room.id, room.name);
                  }}
                  className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4"
                >
                  <div>
                    <label htmlFor={`eq-code-${room.code}`} className="sr-only">Code</label>
                    <input id={`eq-code-${room.code}`} className={input} placeholder="Code (ex. PC-S07-01)" required maxLength={40}
                      value={eq.code} onChange={(e2) => setEq({ ...eq, code: e2.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`eq-name-${room.code}`} className="sr-only">Nom</label>
                    <input id={`eq-name-${room.code}`} className={input} placeholder="Nom (ex. Poste 01)" required maxLength={100}
                      value={eq.name} onChange={(e2) => setEq({ ...eq, name: e2.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`eq-type-${room.code}`} className="sr-only">Type</label>
                    <select id={`eq-type-${room.code}`} className={input}
                      value={eq.type} onChange={(e2) => setEq({ ...eq, type: e2.target.value })}>
                      {EQUIPMENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Ajouter
                  </button>
                </form>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
