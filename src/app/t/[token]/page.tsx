import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  categoryIcon,
  categoryLabel,
  criticalityIcon,
  criticalityLabel,
  friendlyMessage,
  statusLabel,
  STATUS_MAP,
  subIssueLabel,
} from "@/lib/data";
import FeedbackButtons from "@/components/FeedbackButtons";
import PublicCommentForm from "@/components/PublicCommentForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TIMELINE = ["NOUVEAU", "EN_COURS", "RESOLU", "FERME"];

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Page publique de suivi — /t/[token].
 * Aucun compte requis : le jeton suffit (non devinable).
 */
export default async function TrackingPage({
  params,
}: {
  params: { token: string };
}) {
  const incident = await prisma.incident.findUnique({
    where: { token: params.token },
    include: {
      room: true,
      equipment: true,
      comments: {
        where: { internal: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!incident) notFound();

  // EN_ATTENTE est affiché sur l'étape « En cours » de la frise,
  // avec un bandeau dédié.
  const timelineIndex =
    incident.status === "EN_ATTENTE"
      ? 1
      : TIMELINE.indexOf(incident.status);
  const subLabel = subIssueLabel(incident.category, incident.subIssue);

  const relatedKb = await prisma.knowledgeArticle
    .findMany({
      where: { published: true, category: incident.category },
      take: 2,
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true },
    })
    .catch(() => []);

  const canReply =
    incident.status === "NOUVEAU" ||
    incident.status === "EN_COURS" ||
    incident.status === "EN_ATTENTE";

  return (
    <main id="contenu" className="mx-auto min-h-dvh max-w-lg px-4 pb-16 pt-8">
      <header className="text-center">
        <p className="text-sm text-slate-500">Suivi de signalement</p>
        <h1 className="text-3xl font-bold tracking-wide">{incident.ticketNumber}</h1>
        <p
          className={`mt-2 inline-block rounded-full px-4 py-1 text-sm font-semibold ${
            STATUS_MAP[incident.status]?.color ?? "bg-slate-100"
          }`}
        >
          {statusLabel(incident.status)}
        </p>
      </header>

      <p
        className={`mt-6 rounded-2xl p-4 text-center text-slate-700 ${
          incident.status === "EN_ATTENTE" ? "bg-purple-50" : "bg-blue-50"
        }`}
      >
        {friendlyMessage(incident.status)}
      </p>

      {/* Frise du cycle de vie */}
      <section aria-label="Avancement du traitement" className="mt-8">
        <ol className="grid grid-cols-4 gap-1 text-center text-xs">
          {TIMELINE.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                  i <= timelineIndex ? "bg-primary text-white" : "bg-slate-200 text-slate-400"
                }`}
              >
                {i < timelineIndex ? "✓" : i + 1}
              </span>
              <span className={i <= timelineIndex ? "font-semibold" : "text-slate-400"}>
                {statusLabel(s)}
              </span>
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">
          Statut actuel : {statusLabel(incident.status)}
        </p>
      </section>

      {/* Détails */}
      <section aria-labelledby="titre-details" className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
        <h2 id="titre-details" className="mb-3 font-semibold">
          Votre signalement
        </h2>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Problème</dt>
            <dd className="text-right">
              {categoryIcon(incident.category)} {categoryLabel(incident.category)}
              {subLabel ? ` — ${subLabel}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Criticité</dt>
            <dd className="text-right">
              {criticalityIcon(incident.criticality)} {criticalityLabel(incident.criticality)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Lieu</dt>
            <dd className="text-right">
              {incident.room.name}
              {incident.equipment ? ` — ${incident.equipment.name}` : ""}
            </dd>
          </div>
          {incident.description && (
            <div>
              <dt className="text-slate-500">Description</dt>
              <dd className="mt-1">{incident.description}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Signalé le</dt>
            <dd className="text-right">{formatDate(incident.createdAt)}</dd>
          </div>
          {incident.resolvedAt && (
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Résolu le</dt>
              <dd className="text-right">{formatDate(incident.resolvedAt)}</dd>
            </div>
          )}
        </dl>

        {incident.resolutionNote && (
          <div className="mt-4 rounded-xl bg-green-50 p-4 ring-1 ring-green-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Ce qu&apos;a fait l&apos;équipe IT
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-green-900">
              {incident.resolutionNote}
            </p>
          </div>
        )}
      </section>

      {/* Conversation (support + messages du déclarant) */}
      <section
        aria-labelledby="titre-commentaires"
        className="mt-6 rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 id="titre-commentaires" className="mb-3 font-semibold">
          Conversation
        </h2>
        {incident.comments.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucun message pour le moment. Repassez plus tard !
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {incident.comments.map((c) => (
              <li
                key={c.id}
                className={`rounded-xl p-3 text-sm ${
                  c.authorType === "UTILISATEUR" ? "bg-blue-50" : "bg-slate-100"
                }`}
              >
                <p className="font-semibold">
                  {c.authorType === "UTILISATEUR" ? "Vous" : c.authorName}{" "}
                  <span className="font-normal text-slate-500">
                    · {formatDate(c.createdAt)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-line">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Réponse du déclarant */}
      {canReply && (
        <section
          aria-labelledby="titre-repondre"
          className="mt-6 rounded-2xl bg-white p-5 shadow-sm"
        >
          <PublicCommentForm token={incident.token} reporterName={incident.reporterName} />
        </section>
      )}

      {/* Aide autonome */}
      {relatedKb.length > 0 && incident.status !== "FERME" && (
        <section aria-labelledby="titre-kb" className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 id="titre-kb" className="mb-2 font-semibold">
            💡 Pour aller plus loin
          </h2>
          <ul className="grid grid-cols-1 gap-1 text-sm">
            {relatedKb.map((a) => (
              <li key={a.slug}>
                <Link href={`/kb/${a.slug}`} className="text-primary underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            <Link href="/kb" className="underline">
              Voir toute la base de connaissances
            </Link>
          </p>
        </section>
      )}

      {/* Avis du déclarant — visible dès que le ticket est résolu */}
      {(incident.status === "RESOLU" || incident.status === "FERME") && (
        <FeedbackButtons token={incident.token} satisfaction={incident.satisfaction} />
      )}

      <footer className="mt-10 text-center text-sm">
        <p className="text-slate-500">
          Le problème revient ou a changé ?{" "}
          <Link href="/" className="font-medium underline">
            Signalez-le à nouveau
          </Link>
          .
        </p>
        <p className="mt-3 text-xs text-slate-400">
          🔒 RGPD : les données de ce ticket sont supprimées automatiquement
          12 mois après sa fermeture.
        </p>
      </footer>
    </main>
  );
}
