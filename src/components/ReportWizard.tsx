"use client";

import { useEffect, useMemo, useState } from "react";
import type { Room, Equipment } from "@prisma/client";
import {
  CATEGORIES,
  CATEGORY_MAP,
  CRITICALITIES,
  statusLabel,
  criticalityIcon,
  categoryLabel,
  subIssueLabel,
} from "@/lib/data";
import { enqueueReport } from "@/components/PwaClient";

interface WizardProps {
  rooms: Room[];
  equipment: Equipment[];
  initialRoom: Room | null;
  initialEquipment: Equipment | null;
}

interface Duplicate {
  ticketNumber: string;
  status: string;
  criticality: string;
  category: string;
  subIssue: string | null;
  updatedAt: string;
}

interface Result {
  ticketNumber: string;
  token: string;
}

const STEPS = [
  "Lieu",
  "Type de problème",
  "Précisions",
  "Description",
  "Criticité",
  "Contact",
  "Vérification",
];

export default function ReportWizard({
  rooms,
  equipment,
  initialRoom,
  initialEquipment,
}: WizardProps) {
  const [step, setStep] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(initialRoom?.id ?? null);
  const [equipmentId, setEquipmentId] = useState<string | null>(
    initialEquipment?.id ?? null
  );
  const [category, setCategory] = useState<string | null>(null);
  const [subIssue, setSubIssue] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<{ data: string; mime: string }[]>([]);
  const [criticality, setCriticality] = useState<string | null>(null);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [workstationRef, setWorkstationRef] = useState("");

  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [queued, setQueued] = useState(false);

  const room = rooms.find((r) => r.id === roomId) ?? null;
  const roomEquipment = useMemo(
    () => equipment.filter((e) => e.roomId === roomId),
    [equipment, roomId]
  );

  /** Détection de doublons : incidents encore ouverts pour ce lieu. */
  async function checkDuplicates(nextRoomId: string, nextEquipmentId: string | null) {
    setDuplicates([]);
    try {
      const params = new URLSearchParams({ roomId: nextRoomId });
      if (nextEquipmentId) params.set("equipmentId", nextEquipmentId);
      const res = await fetch(`/api/incidents/check?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data.open ?? []);
      }
    } catch {
      /* hors-ligne : pas grave, la vérification est best-effort */
    }
  }

  /**
   * Détection de doublons au chargement : accès direct par QR code
   * (salle/équipement pré-remplis) — vérification immédiate.
   */
  const initialRoomId = initialRoom?.id ?? null;
  const initialEquipmentId = initialEquipment?.id ?? null;
  useEffect(() => {
    if (initialRoomId) {
      checkDuplicates(initialRoomId, initialEquipmentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRoom(id: string) {
    setRoomId(id);
    setEquipmentId(null);
    checkDuplicates(id, null);
    // On reste à l'étape 0 : confirmation du lieu + choix éventuel d'un équipement
  }

  function selectEquipment(id: string | null) {
    setEquipmentId(id);
    if (roomId) checkDuplicates(roomId, id);
  }

  /** Compression photo côté client : max 1280 px, JPEG qualité 0,7. */
  async function onPhotoSelected(files: FileList | null) {
    if (!files) return;
    const remaining = 3 - photos.length;
    const list = Array.from(files).slice(0, remaining);
    const compressed: { data: string; mime: string }[] = [];
    for (const file of list) {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const img = await createImageBitmap(blob).catch(() => null);
      if (!img) continue;
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.7);
      compressed.push({ data, mime: "image/jpeg" });
    }
    setPhotos((p) => [...p, ...compressed].slice(0, 3));
  }

  async function submit() {
    if (!roomId || !category || !criticality) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      roomId,
      equipmentId,
      category,
      subIssue,
      description,
      criticality,
      reporterName: reporterName || null,
      reporterEmail: reporterEmail || null,
      workstationRef: workstationRef || null,
      photos,
    };
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "L'envoi a échoué.");
      }
      setResult(await res.json());
      setQueued(false);
      setStep(7);
    } catch {
      // Mode dégradé hors-ligne : mise en file d'envoi
      enqueueReport(payload);
      setQueued(true);
      setStep(7);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Écran de confirmation ────────────────────────────────────────
  if (step === 7 && result) {
    return (
      <div className="rounded-2xl border border-green-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✅
        </div>
        <h2 className="text-xl font-bold">Merci ! Votre signalement est enregistré.</h2>
        <p className="mt-2 text-slate-600">
          L&apos;équipe IT vient d&apos;être prévenue.
        </p>
        <div className="my-6 rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-600">Votre numéro de ticket</p>
          <p className="text-2xl font-bold tracking-wide">{result.ticketNumber}</p>
        </div>
        <img
          src={`/api/qr?url=${encodeURIComponent(`/t/${result.token}`)}`}
          alt={`QR code de suivi du ticket ${result.ticketNumber}`}
          className="mx-auto h-40 w-40 rounded-lg border border-slate-200 bg-white p-2"
          width={160}
          height={160}
        />
        <p className="mt-3 text-sm text-slate-600">
          Scannez ce QR code ou ouvrez le lien ci-dessous pour suivre l&apos;avancement.
        </p>
        <a
          href={`/t/${result.token}`}
          className="mt-4 block rounded-xl bg-primary px-6 py-3 font-semibold text-white"
        >
          Suivre mon ticket
        </a>
        <a href="/" className="mt-3 inline-block text-sm underline">
          Retour à l&apos;accueil
        </a>
      </div>
    );
  }

  if (step === 7 && queued) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm" role="alert">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
          📴
        </div>
        <h2 className="text-xl font-bold">Pas de réseau — c&apos;est enregistré !</h2>
        <p className="mt-2 text-slate-600">
          Votre signalement a été mis en file d&apos;attente sur votre téléphone.
          Il sera envoyé automatiquement dès que la connexion reviendra. Vous
          recevrez votre numéro de ticket à l&apos;envoi.
        </p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-white">
          D&apos;accord
        </a>
      </div>
    );
  }

  const canContinue =
    (step === 0 && roomId !== null) ||
    (step === 1 && category !== null) ||
    (step === 2 && subIssue !== null) ||
    step === 3 ||
    (step === 4 && criticality !== null) ||
    step === 5 ||
    step === 6;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Barre de progression */}
      <div aria-hidden="true">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Étape {step + 1} / {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* ── Étape 0 : lieu ─────────────────────────────────────────── */}
      {step === 0 && (
        <fieldset className="mt-5">
          <legend className="mb-3 text-lg font-semibold">
            {room ? "C'est bien ici ?" : "Où êtes-vous ?"}
          </legend>

          {room ? (
            <>
              <p className="rounded-xl bg-slate-100 p-4">
                <span className="font-semibold">{room.name}</span>
                {equipmentId &&
                  roomEquipment.find((e) => e.id === equipmentId) && (
                    <span className="block text-sm text-slate-600">
                      {roomEquipment.find((e) => e.id === equipmentId)!.name}
                    </span>
                  )}
              </p>

              {roomEquipment.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-slate-600">
                    Un équipement précis ? (facultatif)
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {roomEquipment.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        aria-pressed={equipmentId === e.id}
                        onClick={() => selectEquipment(e.id)}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl border px-4 py-2 text-left ${
                          equipmentId === e.id
                            ? "border-primary bg-blue-50 ring-2 ring-primary"
                            : "border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{e.name}</span>
                        <span className="text-xs text-slate-400">{e.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[48px] rounded-xl bg-primary px-6 font-semibold text-white"
                >
                  Oui, continuer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoomId(null);
                    setEquipmentId(null);
                    setDuplicates([]);
                  }}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-6"
                >
                  Changer de lieu
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectRoom(r.id)}
                  className="min-h-[48px] rounded-xl border border-slate-300 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="font-medium">{r.name}</span>
                  {r.building && (
                    <span className="block text-xs text-slate-500">{r.building}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Détection de doublons */}
          {duplicates.length > 0 && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"
            >
              <p className="font-semibold text-amber-900">
                ⚠️ Déjà signalé — en cours de traitement
              </p>
              {duplicates.map((d) => (
                <p key={d.ticketNumber} className="mt-1 text-amber-900">
                  Ticket {d.ticketNumber} · {statusLabel(d.status)} ·{" "}
                  {subIssueLabel(d.category, d.subIssue) ?? categoryLabel(d.category)} ·
                  dernière mise à jour{" "}
                  {new Date(d.updatedAt).toLocaleDateString("fr-FR")}
                  <br />
                  <span className="text-amber-700">
                    Vous pouvez quand même signaler si le problème est différent
                    ou persiste.
                  </span>
                </p>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {/* ── Étape 1 : catégorie ────────────────────────────────────── */}
      {step === 1 && (
        <fieldset className="mt-5">
          <legend className="mb-3 text-lg font-semibold">Quel est le problème ?</legend>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={category === c.key}
                onClick={() => {
                  setCategory(c.key);
                  setSubIssue(null);
                  setStep(2);
                }}
                className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm ${
                  category === c.key
                    ? "border-primary bg-blue-50 ring-2 ring-primary"
                    : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span aria-hidden="true" className="text-2xl">
                  {c.icon}
                </span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* ── Étape 2 : sous-question ─────────────────────────────────── */}
      {step === 2 && category && (
        <fieldset className="mt-5">
          <legend className="mb-3 text-lg font-semibold">
            {CATEGORY_MAP[category].icon} {CATEGORY_MAP[category].label} :{" "}
            que se passe-t-il ?
          </legend>
          <div className="grid grid-cols-1 gap-2">
            {CATEGORY_MAP[category].subIssues.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={subIssue === s.key}
                onClick={() => {
                  setSubIssue(s.key);
                  setStep(3);
                }}
                className={`min-h-[48px] rounded-xl border px-4 py-3 text-left ${
                  subIssue === s.key
                    ? "border-primary bg-blue-50 ring-2 ring-primary"
                    : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* ── Étape 3 : description + photos ─────────────────────────── */}
      {step === 3 && (
        <fieldset className="mt-5">
          <legend className="mb-3 text-lg font-semibold">
            Décrivez en quelques mots{" "}
            <span className="text-sm font-normal text-slate-500">(facultatif)</span>
          </legend>
          <label htmlFor="description" className="sr-only">
            Description du problème
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            placeholder="Ex. : l'écran clignote depuis ce matin, surtout après 30 min d'utilisation…"
            className="w-full rounded-xl border border-slate-300 p-3 text-base"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{description.length}/500</p>

          <div className="mt-4">
            <p id="label-photos" className="mb-2 font-medium">
              📷 Une photo aide beaucoup{" "}
              <span className="font-normal text-slate-500">(facultatif, 3 max)</span>
            </p>
            <label
              htmlFor="input-photos"
              aria-labelledby="label-photos"
              className="flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-slate-600 hover:bg-slate-50"
            >
              Prendre ou choisir une photo
            </label>
            <input
              id="input-photos"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => {
                onPhotoSelected(e.target.files);
                e.target.value = "";
              }}
            />
            {photos.length > 0 && (
              <ul className="mt-3 flex gap-2" aria-label="Photos ajoutées">
                {photos.map((p, i) => (
                  <li key={i} className="relative">
                    {/* Miniature locale (base64), envoyée avec le signalement */}
                    <img
                      src={p.data}
                      alt={`Photo ${i + 1} du problème`}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Retirer la photo ${i + 1}`}
                      onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>
      )}

      {/* ── Étape 4 : criticité ────────────────────────────────────── */}
      {step === 4 && (
        <fieldset className="mt-5">
          <legend className="mb-3 text-lg font-semibold">Ça vous bloque combien ?</legend>
          <div className="grid grid-cols-1 gap-2">
            {CRITICALITIES.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={criticality === c.key}
                onClick={() => {
                  setCriticality(c.key);
                  setStep(5);
                }}
                className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                  criticality === c.key
                    ? "border-primary bg-blue-50 ring-2 ring-primary"
                    : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span aria-hidden="true" className="text-2xl">
                  {c.icon}
                </span>
                <span>
                  <span className="font-semibold">{c.label}</span>
                  <span className="block text-sm text-slate-500">{c.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* ── Étape 5 : identification (optionnelle) ──────────────────── */}
      {step === 5 && (
        <fieldset className="mt-5">
          <legend className="mb-1 text-lg font-semibold">
            Voulez-vous être contacté ?
          </legend>
          <p className="mb-3 text-sm text-slate-600">
            Tout est facultatif — le signalement anonyme est possible.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="nom" className="mb-1 block text-sm font-medium">
                Votre nom
              </label>
              <input
                id="nom"
                autoComplete="name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value.slice(0, 100))}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Votre email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value.slice(0, 150))}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
            <div>
              <label htmlFor="poste" className="mb-1 block text-sm font-medium">
                Numéro de poste / badge
              </label>
              <input
                id="poste"
                inputMode="text"
                placeholder="Ex. : P-204"
                value={workstationRef}
                onChange={(e) => setWorkstationRef(e.target.value.slice(0, 50))}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            🔒 RGPD : ces informations ne servent qu&apos;à vous tenir informé.
            Elles sont supprimées avec le ticket au bout de 12 mois.
          </p>
        </fieldset>
      )}

      {/* ── Étape 6 : micro-guides + récapitulatif ─────────────────── */}
      {step === 6 && category && (
        <fieldset className="mt-5">
          <legend className="mb-3 text-lg font-semibold">
            Avant d&apos;envoyer, avez-vous vérifié… ?
          </legend>
          <ul className="grid grid-cols-1 gap-2 rounded-xl bg-blue-50 p-4 text-sm">
            {CATEGORY_MAP[category].guides.map((g) => (
              <li key={g} className="flex gap-2">
                <span aria-hidden="true">✔️</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl border border-slate-200 p-4 text-sm">
            <p className="mb-2 font-semibold">Récapitulatif</p>
            <ul className="grid grid-cols-1 gap-1 text-slate-700">
              <li>
                📍 {room?.name}
                {equipmentId && roomEquipment.find((e) => e.id === equipmentId)
                  ? ` — ${roomEquipment.find((e) => e.id === equipmentId)!.name}`
                  : ""}
              </li>
              <li>
                {CATEGORY_MAP[category].icon} {CATEGORY_MAP[category].label}
                {subIssue &&
                  ` — ${CATEGORY_MAP[category].subIssues.find((s) => s.key === subIssue)?.label}`}
              </li>
              <li>
                {criticalityIcon(criticality!)}{" "}
                {CRITICALITIES.find((c) => c.key === criticality)?.label}
              </li>
              {description && (
                <li>
                  📝 {description.slice(0, 120)}
                  {description.length > 120 ? "…" : ""}
                </li>
              )}
              {photos.length > 0 && <li>📷 {photos.length} photo(s)</li>}
              <li>{reporterName ? `👤 ${reporterName}` : "👤 Anonyme"}</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="mt-5 min-h-[52px] w-full rounded-xl bg-primary px-6 text-lg font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Envoi en cours…" : "Envoyer le signalement"}
          </button>
        </fieldset>
      )}

      {/* Navigation */}
      {step > 0 && step < 6 && (
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="min-h-[48px] flex-1 rounded-xl border border-slate-300 px-4 font-medium"
          >
            ← Retour
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
            className="min-h-[48px] flex-1 rounded-xl bg-primary px-4 font-semibold text-white disabled:opacity-40"
          >
            Continuer →
          </button>
        </div>
      )}
      {step === 6 && (
        <button
          type="button"
          onClick={() => setStep(5)}
          className="mt-3 min-h-[48px] w-full rounded-xl border border-slate-300 px-4 font-medium"
        >
          ← Retour
        </button>
      )}
    </div>
  );
}
