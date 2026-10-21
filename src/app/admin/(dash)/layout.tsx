import AdminNav from "@/components/AdminNav";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Layout du groupe protégé : toutes les pages sous /admin (sauf /admin/login)
 * passent ici. Garde d'authentification — redirection vers la connexion si
 * aucune session valide.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminNav adminName={admin.name} />
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
