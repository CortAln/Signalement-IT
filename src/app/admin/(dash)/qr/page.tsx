import QrSheet from "@/components/QrSheet";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const metadata = { title: "Étiquettes QR — Console IT" };

/**
 * Générateur d'étiquettes QR : une feuille A4 imprimable par salle
 * (QR générique de salle + un QR par équipement).
 * Guide complet de déploiement : voir docs/GUIDE-QR.md
 */
export default async function QrLabelsPage() {
  const [rooms, equipment, h] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ orderBy: { code: "asc" } }),
    headers(),
  ]);

  // URL publique absolue : en production, NEXT_PUBLIC_BASE_URL ;
  // sinon, on reprend l'origine de la requête (pratique en local/dev).
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl =
    process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_BASE_URL
      ? process.env.NEXT_PUBLIC_BASE_URL
      : `${proto}://${host}`;

  return (
    <>
      <h1 className="text-2xl font-bold">Générateur d&apos;étiquettes QR</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Sélectionnez les salles puis imprimez : chaque feuille A4 contient le
        QR générique de la salle (🟦) et un QR par équipement. À coller sur
        chaque poste, écran ou en entrée de salle. Format d&apos;URL :{" "}
        <code className="rounded bg-slate-100 px-1 font-mono text-xs">
          {baseUrl}/r?salle=&lt;CODE&gt;&amp;eq=&lt;ÉQUIPEMENT&gt;
        </code>
      </p>
      <QrSheet rooms={rooms} equipment={equipment} baseUrl={baseUrl} />
    </>
  );
}
