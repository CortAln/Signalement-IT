import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaClient from "@/components/PwaClient";

export const metadata: Metadata = {
  title: "Signalement IT",
  description:
    "Signalez en moins de 30 secondes un problème IT ou matériel : écran, PC, imprimante, Wi-Fi…",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Lien d'évitement pour la navigation clavier (WCAG 2.4.1) */}
        <a
          href="#contenu"
          className="sr-only-focusable absolute left-2 top-2 z-50 rounded bg-primary px-4 py-2 text-white"
        >
          Aller au contenu principal
        </a>
        {children}
        <PwaClient />
      </body>
    </html>
  );
}
