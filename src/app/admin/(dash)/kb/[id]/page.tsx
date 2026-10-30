import KbForm from "@/components/KbForm";
import Prose from "@/components/Prose";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteArticle, updateArticle } from "../actions";

export const metadata = { title: "Modifier l'article — Console IT" };

export default async function EditKbArticlePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: params.id },
  });
  if (!article) notFound();

  return (
    <>
      <nav aria-label="Fil d'ariane" className="mb-4 text-sm text-slate-600">
        <Link href="/admin/kb" className="text-primary underline">
          ← Base de connaissances
        </Link>
      </nav>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Modifier l&apos;article</h1>
        <span className="font-mono text-xs text-slate-400">/kb/{article.slug}</span>
      </div>

      {searchParams.saved === "1" && (
        <p role="status" className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-800">
          ✅ Modifications enregistrées.
        </p>
      )}
      {searchParams.created === "1" && (
        <p role="status" className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-800">
          🎉 Article créé. Pensez à le publier pour le rendre visible sur /kb.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <KbForm
            action={updateArticle}
            article={{
              id: article.id,
              title: article.title,
              category: article.category,
              keywords: article.keywords,
              content: article.content,
              published: article.published,
              slug: article.slug,
            }}
          />
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Aperçu</h2>
          <article className="prose-content">
            <h3 className="text-xl font-bold">{article.title}</h3>
            <Prose content={article.content} />
          </article>
        </section>
      </div>

      <form action={deleteArticle} className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-red-700">Supprimer cet article</h2>
        <p className="mb-3 text-sm text-slate-600">Action irréversible.</p>
        <input type="hidden" name="id" value={article.id} />
        <button
          type="submit"
          className="min-h-[44px] rounded-lg bg-red-600 px-4 font-semibold text-white hover:bg-red-700"
        >
          🗑️ Supprimer
        </button>
      </form>
    </>
  );
}
