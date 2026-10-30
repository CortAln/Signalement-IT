import KbForm from "@/components/KbForm";
import Link from "next/link";
import { createArticle } from "../actions";

export const metadata = { title: "Nouvel article — Console IT" };

export default async function NewKbArticlePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <>
      <nav aria-label="Fil d'ariane" className="mb-4 text-sm text-slate-600">
        <Link href="/admin/kb" className="text-primary underline">
          ← Base de connaissances
        </Link>
      </nav>
      <h1 className="mb-4 text-2xl font-bold">Nouvel article</h1>
      {searchParams.error === "champs" && (
        <p role="alert" className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          Titre et contenu obligatoires.
        </p>
      )}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <KbForm action={createArticle} />
      </section>
    </>
  );
}
