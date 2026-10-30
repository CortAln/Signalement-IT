import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/data";
import Link from "next/link";
import { togglePublish } from "./actions";

export const metadata = { title: "Base de connaissances — Console IT" };

const KB_CATEGORIES = [
  ...CATEGORIES.map((c) => ({ key: c.key, label: `${c.icon} ${c.label}` })),
  { key: "GENERAL", label: "🌐 Général" },
];

export default async function AdminKbPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const q =
    typeof searchParams.q === "string" && searchParams.q
      ? searchParams.q
      : undefined;

  const where = q
    ? {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { keywords: { contains: q } },
        ],
      }
    : {};

  const articles = await prisma.knowledgeArticle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Base de connaissances</h1>
        <Link
          href="/admin/kb/nouveau"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          ➕ Nouvel article
        </Link>
      </div>

      <form role="search" action="/admin/kb" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="🔍 Rechercher un article…"
          className="min-h-[40px] flex-1 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <button
          type="submit"
          className="min-h-[40px] rounded-lg bg-primary px-4 text-sm font-semibold text-white"
        >
          Rechercher
        </button>
      </form>

      {searchParams.deleted === "1" && (
        <p role="status" className="mb-3 rounded-lg bg-green-100 p-3 text-sm text-green-800">
          ✅ Article supprimé.
        </p>
      )}
      {searchParams.error === "lecture-seule" && (
        <p role="alert" className="mb-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          👁️ Profil en lecture seule : modification impossible.
        </p>
      )}

      {articles.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
          Aucun article pour l&apos;instant. Créez le premier pour aider les
          utilisateurs en autonomie ! 💡
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Articles de la base de connaissances</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="p-3">Titre</th>
                <th scope="col" className="p-3">Catégorie</th>
                <th scope="col" className="p-3">Statut</th>
                <th scope="col" className="p-3">Vues</th>
                <th scope="col" className="p-3">Maj</th>
                <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                  <td className="p-3 font-medium">
                    <Link href={`/admin/kb/${a.id}`} className="text-primary underline">
                      {a.title}
                    </Link>
                    <span className="block font-mono text-xs text-slate-400">/kb/{a.slug}</span>
                  </td>
                  <td className="p-3">
                    {KB_CATEGORIES.find((c) => c.key === a.category)?.label ?? a.category}
                  </td>
                  <td className="p-3">
                    {a.published ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        Publié
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="p-3 tabular-nums">{a.views}</td>
                  <td className="p-3 whitespace-nowrap text-slate-600">
                    {a.updatedAt.toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {a.published && (
                        <Link
                          href={`/kb/${a.slug}`}
                          className="text-xs font-semibold text-primary underline"
                        >
                          Voir
                        </Link>
                      )}
                      <form action={togglePublish}>
                        <input type="hidden" name="id" value={a.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                        >
                          {a.published ? "Dépublier" : "Publier"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
