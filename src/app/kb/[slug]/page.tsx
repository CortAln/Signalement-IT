import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/data";
import Prose from "@/components/Prose";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { slug: params.slug },
  });
  return {
    title: article ? `${article.title} — Aide IT` : "Article introuvable",
    description: article?.content.slice(0, 150) ?? undefined,
  };
}

export default async function KbArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { slug: params.slug },
  });
  if (!article || !article.published) notFound();

  // Compteur de vues (best-effort)
  await prisma.knowledgeArticle
    .update({ where: { id: article.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  const related = await prisma.knowledgeArticle.findMany({
    where: { published: true, category: article.category, id: { not: article.id } },
    take: 3,
    orderBy: { updatedAt: "desc" },
  });

  const catLabel =
    CATEGORIES.find((c) => c.key === article.category)?.label ?? "Général";

  return (
    <main id="contenu" className="mx-auto min-h-dvh max-w-2xl px-4 pb-16 pt-8">
      <nav aria-label="Fil d'ariane" className="mb-4 text-sm">
        <Link href="/kb" className="text-primary underline">
          ← Base de connaissances
        </Link>
      </nav>

      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {catLabel}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{article.title}</h1>
        <div className="mt-4">
          <Prose content={article.content} />
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="kb-related" className="mt-6">
          <h2 id="kb-related" className="mb-2 font-semibold">
            Sur le même sujet
          </h2>
          <ul className="grid grid-cols-1 gap-2">
            {related.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-4 text-sm shadow-sm hover:shadow-md">
                <Link href={`/kb/${r.slug}`} className="font-medium text-primary underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 rounded-2xl bg-blue-50 p-5 text-center text-sm">
        <p className="font-medium">Ça n&apos;a pas réglé votre problème ?</p>
        <Link
          href="/"
          className="mt-3 inline-block min-h-[44px] rounded-lg bg-primary px-6 py-3 font-semibold text-white"
        >
          🛠️ Signaler le problème à l&apos;équipe IT
        </Link>
      </footer>
    </main>
  );
}
