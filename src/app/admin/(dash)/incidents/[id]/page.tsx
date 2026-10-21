import IncidentActions from "@/components/IncidentActions";
import {
  STATUS_MAP,
  categoryLabel,
  criticalityIcon,
  criticalityLabel,
  subIssueLabel,
} from "@/lib/data";
import { getCurrentAdmin, requireApiAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const dateFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function IncidentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireApiAdmin();
  if (!admin) redirect("/admin/login");

  const incident = await prisma.incident.findUnique({
    where: { id: params.id },
    include: {
      room: true,
      equipment: true,
      assignedTo: true,
      photos: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!incident) notFound();

  const technicians = await prisma.adminUser.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const st = STATUS_MAP[incident.status];
  const fullAdmin = await getCurrentAdmin();

  async function deleteIncident() {
    "use server";
    const admin = await requireApiAdmin();
    if (!admin || admin.role !== "ADMIN") redirect("/admin");
    await prisma.incident.delete({ where: { id: incident.id } }).catch(() => {});
    redirect("/admin");
  }

  return (
    <>
      <nav aria-label="Fil d'ariane" className="mb-4 text-sm text-slate-600">
        <Link href="/admin" className="text-primary underline">
          ← Retour à la liste
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Colonne gauche : fiche de l'incident ── */}
        <div className="grid grid-cols-1 gap-4 lg:col-span-2">
          <section
            aria-labelledby="titre-fiche"
            className="rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1
                  id="titre-fiche"
                  className="font-mono text-2xl font-bold"
                >
                  {incident.ticketNumber}
                </h1>
                <p className="text-sm text-slate-500">
                  Signalé le {dateFr(incident.createdAt)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${st?.color ?? ""}`}
              >
                {st?.label ?? incident.status}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Criticité
                </dt>
                <dd className="font-medium">
                  {criticalityIcon(incident.criticality)}{" "}
                  {criticalityLabel(incident.criticality)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Catégorie
                </dt>
                <dd className="font-medium">{categoryLabel(incident.category)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Problème précis
                </dt>
                <dd className="font-medium">
                  {subIssueLabel(incident.category, incident.subIssue) ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Salle
                </dt>
                <dd className="font-medium">
                  {incident.room.name}
                  <span className="font-mono text-xs text-slate-500">
                    {" "}({incident.room.code})
                  </span>
                </dd>
              </div>
              {incident.equipment && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Équipement
                  </dt>
                  <dd className="font-medium">
                    {incident.equipment.name}{" "}
                    <span className="font-mono text-xs text-slate-500">
                      ({incident.equipment.code})
                    </span>
                  </dd>
                </div>
              )}
              {incident.reporterName && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Signalé par
                  </dt>
                  <dd className="font-medium">
                    {incident.reporterName}
                    {incident.reporterEmail && (
                      <span className="block text-xs text-slate-500">
                        {incident.reporterEmail}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {incident.workstationRef && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Poste / badge
                  </dt>
                  <dd className="font-mono font-medium">{incident.workstationRef}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Jeton de suivi public
                </dt>
                <dd className="break-all">
                  <a
                    href={`/t/${incident.token}`}
                    className="font-mono text-primary underline"
                  >
                    /t/{incident.token}
                  </a>
                </dd>
              </div>
            </dl>

            {incident.description && (
              <div className="mt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description du déclarant
                </h2>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">
                  {incident.description}
                </p>
              </div>
            )}

            {incident.resolvedAt && (
              <p className="mt-4 text-sm text-green-700">
                ✅ Résolu le {dateFr(incident.resolvedAt)}
                {incident.closedAt && ` — fermé le ${dateFr(incident.closedAt)}`}
              </p>
            )}
          </section>

          {incident.photos.length > 0 && (
            <section
              aria-labelledby="titre-photos"
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <h2 id="titre-photos" className="mb-3 font-semibold">
                Photos ({incident.photos.length})
              </h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {incident.photos.map((p) => (
                  <li key={p.id}>
                    <a href={p.data} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.data}
                        alt={`Photo jointe au signalement ${incident.ticketNumber}`}
                        className="w-full rounded-lg border border-slate-200"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {fullAdmin?.role === "ADMIN" && (
            <form action={deleteIncident} className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-red-700">Zone dangereuse</h2>
              <p className="mb-3 text-sm text-slate-600">
                Supprimer définitivement cet incident et ses photos
                (purge RGPD / demande de retrait). Action irréversible.
              </p>
              <button
                type="submit"
                className="min-h-[44px] rounded-lg bg-red-600 px-4 font-semibold text-white hover:bg-red-700"
              >
                🗑️ Supprimer l&apos;incident
              </button>
            </form>
          )}
        </div>

        {/* ── Colonne droite : cycle de vie, assignation, commentaires ── */}
        <IncidentActions
          incidentId={incident.id}
          status={incident.status}
          assignedToId={incident.assignedToId}
          technicians={technicians}
          comments={incident.comments.map((c) => ({
            id: c.id,
            authorName: c.authorName,
            body: c.body,
            internal: c.internal,
            createdAt: c.createdAt.toISOString(),
          }))}
        />
      </div>
    </>
  );
}
