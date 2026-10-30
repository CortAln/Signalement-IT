"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function navLinks(role: string | undefined) {
  const links = [
    { href: "/admin/dashboard", label: "Tableau de bord" },
    { href: "/admin", label: "Tickets" },
    { href: "/admin/carte", label: "Carte des salles" },
    { href: "/admin/stats", label: "Statistiques" },
    { href: "/admin/kb", label: "Base de connaissances" },
    { href: "/admin/qr", label: "Étiquettes QR" },
    { href: "/admin/referentiel", label: "Salles & équipements" },
  ];
  if (role === "ADMIN") {
    links.push({ href: "/admin/utilisateurs", label: "Utilisateurs" });
  }
  return links;
}

export default function AdminNav({
  adminName,
  adminRole,
}: {
  adminName: string;
  adminRole?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = navLinks(adminRole);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="no-print border-b border-slate-300 bg-primary-dark text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <nav aria-label="Navigation console admin">
          <ul className="flex flex-wrap items-center gap-1">
            <li>
              <Link
                href="/admin/dashboard"
                className="mr-2 rounded-lg px-3 py-2 font-bold hover:bg-white/10"
              >
                🛠️ Console IT
              </Link>
            </li>
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 hover:bg-white/10 ${
                      active ? "bg-white/20 font-semibold" : ""
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-80">
            {adminName}
            {adminRole && (
              <span className="ml-1 rounded bg-white/20 px-1.5 text-xs">
                {adminRole === "ADMIN" ? "Admin" : adminRole === "LECTEUR" ? "Lecture" : "Tech"}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-white/40 px-3 py-1.5 hover:bg-white/10"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </header>
  );
}
