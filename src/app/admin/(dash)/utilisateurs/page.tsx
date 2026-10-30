import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createUser, updateUser } from "./actions";

export const metadata = { title: "Utilisateurs — Console IT" };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  TECHNICIEN: "Technicien",
  LECTEUR: "Lecture seule",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const current = await getCurrentAdmin();
  if (!current) redirect("/admin/login");
  if (current.role !== "ADMIN") redirect("/admin?error=forbidden");

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assigned: true, sessions: true } } },
  });

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Utilisateurs & rôles</h1>

      {searchParams.created === "1" && (
        <p role="status" className="mb-3 rounded-lg bg-green-100 p-3 text-sm text-green-800">
          ✅ Utilisateur créé.
        </p>
      )}
      {searchParams.saved === "1" && (
        <p role="status" className="mb-3 rounded-lg bg-green-100 p-3 text-sm text-green-800">
          ✅ Modifications enregistrées.
        </p>
      )}
      {searchParams.error === "champs" && (
        <p role="alert" className="mb-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          Nom, email obligatoires et mot de passe d&apos;au moins 8 caractères.
        </p>
      )}
      {searchParams.error === "email-existant" && (
        <p role="alert" className="mb-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          Cet email est déjà utilisé.
        </p>
      )}
      {searchParams.error === "mdp-court" && (
        <p role="alert" className="mb-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">
          Mot de passe trop court (8 caractères minimum).
        </p>
      )}

      {/* Création */}
      <section aria-labelledby="titre-new-user" className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 id="titre-new-user" className="mb-3 font-semibold">
          ➕ Nouvel utilisateur
        </h2>
        <form action={createUser} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="u-name" className="mb-1 block text-sm font-medium">Nom</label>
            <input id="u-name" name="name" type="text" required placeholder="Marie Dupont"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="u-email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="u-email" name="email" type="email" required placeholder="marie@exemple.fr"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="u-password" className="mb-1 block text-sm font-medium">
              Mot de passe (8+)
            </label>
            <input id="u-password" name="password" type="password" required minLength={8}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="u-role" className="mb-1 block text-sm font-medium">Rôle</label>
            <select id="u-role" name="role" defaultValue="TECHNICIEN"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm">
              <option value="TECHNICIEN">Technicien</option>
              <option value="ADMIN">Administrateur</option>
              <option value="LECTEUR">Lecture seule</option>
            </select>
          </div>
          <button type="submit"
            className="min-h-[44px] rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark sm:col-span-2 lg:col-span-4">
            Créer l&apos;utilisateur
          </button>
        </form>
      </section>

      {/* Liste */}
      <section aria-labelledby="titre-users" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 id="titre-users" className="mb-3 font-semibold">
          👥 Comptes ({users.length})
        </h2>
        <ul className="grid grid-cols-1 gap-4">
          {users.map((u) => (
            <li key={u.id} className="rounded-xl border border-slate-200 p-4">
              <form action={updateUser} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <input type="hidden" name="id" value={u.id} />
                <div>
                  <label htmlFor={`name-${u.id}`} className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Nom
                  </label>
                  <input id={`name-${u.id}`} name="name" type="text" defaultValue={u.name}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm" />
                  <p className="mt-1 text-xs text-slate-500">{u.email}</p>
                </div>
                <div>
                  <label htmlFor={`role-${u.id}`} className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Rôle
                  </label>
                  <select id={`role-${u.id}`} name="role" defaultValue={u.role}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="TECHNICIEN">Technicien</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="LECTEUR">Lecture seule</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={`pw-${u.id}`} className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Nouveau mot de passe
                  </label>
                  <input id={`pw-${u.id}`} name="newPassword" type="password" placeholder="(inchangé)"
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>
                <div className="flex flex-col justify-center gap-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4" />
                    Actif
                  </label>
                  <p className="text-xs text-slate-500">
                    {ROLE_LABEL[u.role] ?? u.role} · {u._count.assigned} ticket(s) assigné(s)
                    {u.id === current.id && " · 👋 vous"}
                  </p>
                </div>
                <div className="flex items-end justify-end">
                  <button type="submit"
                    className="min-h-[44px] rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark">
                    💾 Enregistrer
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-4 text-xs text-slate-500">
        Les profils « Lecture seule » peuvent consulter les tickets et
        statistiques mais pas les modifier. Désactiver un compte déconnecte
        immédiatement ses sessions.
      </p>
    </>
  );
}
