import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Base de connaissances — Signalement IT",
  description: "Solutions et astuces pour résoudre les petits problèmes IT soi-même.",
};

const KB_CATEGORIES = [
  ...CATEGORIES.map((c) => ({ key: c.key, label: `${c.icon} ${c.label}` })),
  { key: "GENERAL", label: "🌐 Général" },
];

export default async function KbHomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const q =
    typeof searchParams.q === "string" && searchParams.q ? searchParams.q : undefined;
  const category =
    typeof searchParams.category === "string" && searchParams.category
      ? searchParams.category
      : undefined;

  const where: Record<string, unknown> = { published: true };
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
      { keywords: { contains: q } },
    ];
  }

  const [articles, counts] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where,
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
      take: 60,
    }),
    prisma.knowledgeArticle.groupBy({
      by: ["category"],
      where: { published: true },
      _count: { _all: true },
    }),
  ]);

  const countByCategory: Record<string, number> = {};
  for (const row of counts) countByCategory[row.category] = row._count._all;

  return (
    <main id="contenu" className="mx-auto min-h-dvh max-w-2xl px-4 pb-16 pt-8">
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
          💡
        </div>
        <h1 className="text-2xl font-bold">Base de connaissances</h1>
        <p className="mt-2 text-slate-600">
          Des solutions simples, testées, pour se dépanner soi-même — avant ou
          après avoir signalé un problème.
        </p>
      </header>

      <form role="search" action="/kb" className="mt-6 flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="🔍 Rechercher (ex. : écran noir, wifi, imprimante…)"
          className="min-h-[48px] flex-1 rounded-lg border border-slate-300 px-3"
        />
        <button type="submit" className="min-h-[48px] rounded-lg bg-primary px-4 font-semibold text-white">
          Chercher
        </button>
      </form>

      <nav aria-label="Catégories" className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/kb"
          className={`rounded-full border px-3 py-1 text-sm ${
            !category ? "border-primary bg-blue-50 font-semibold" : "border-slate-300 bg-white"
          }`}
        >
          Toutes
        </Link>
        {KB_CATEGORIES.filter((c) => (countByCategory[c.key] ?? 0) > 0).map((c) => (
          <Link
            key={c.key}
            href={`/kb?category=${c.key}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              category === c.key
                ? "border-primary bg-blue-50 font-semibold"
                : "border-slate-300 bg-white"
            }`}
          >
            {c.label} ({countByCategory[c.key]})
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
          Aucun article {q || category ? "ne correspond à votre recherche" : "publié pour l'instant"}.
          <p className="mt-3">
            <Link href="/" className="font-medium text-primary underline">
              Signalez votre problème →
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3">
          {articles.map((a) => (
            <li key={a.id} className="rounded-2xl bg-white p-5 shadow-sm hover:shadow-md">
              <Link href={`/kb/${a.slug}`} className="block">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {KB_CATEGORIES.find((c) => c.key === a.category)?.label ?? a.category}
                </p>
                <h2 className="mt-1 font-semibold text-primary-dark">{a.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {a.content.replace(/[#-]/g, "").slice(0, 160)}…
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  👁️ {a.views} vue{a.views > 1 ? "s" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 text-center text-xs text-slate-500">
        <p>
          <Link href="/" className="underline">Signaler un problème</Link>
          {" · "}
          <Link href="/suivi" className="underline">Suivre un ticket</Link>
        </p>
      </footer>
    </main>
  );
}
