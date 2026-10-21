import LoginForm from "@/components/LoginForm";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Connexion — Console IT" };

export default async function AdminLoginPage() {
  // Déjà connecté : direction la console.
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <main
      id="contenu"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10"
    >
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Service informatique
        </p>
        <h1 className="mt-1 text-2xl font-bold">Console d&apos;administration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Réservée à l&apos;équipe IT. Le signalement d&apos;un incident ne
          nécessite <strong>aucun compte</strong> : il se fait depuis
          l&apos;accueil public.
        </p>
        <LoginForm />
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Les comptes sont créés par un administrateur. En cas de mot de passe
          perdu, contactez le service IT.
        </p>
      </div>
    </main>
  );
}
