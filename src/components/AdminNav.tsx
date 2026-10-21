"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Incidents" },
  { href: "/admin/carte", label: "Carte des salles" },
  { href: "/admin/stats", label: "Statistiques" },
  { href: "/admin/qr", label: "Étiquettes QR" },
];

export default function AdminNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();

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
                href="/admin"
                className="mr-2 rounded-lg px-3 py-2 font-bold hover:bg-white/10"
              >
                🛠️ Console IT
              </Link>
            </li>
            {LINKS.map((l) => {
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
          <span className="opacity-80">{adminName}</span>
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
