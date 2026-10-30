import type { ReactNode } from "react";

/**
 * Rendu minimaliste de contenu textuel de la base de connaissances :
 * - lignes "## Titre" → sous-titres
 * - lignes "- item" → listes à puces
 * - paragraphes séparés par une ligne vide
 * (Volontairement sans dépendance markdown.)
 */
export default function Prose({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/);
  const out: ReactNode[] = [];

  blocks.forEach((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return;

    const listLines = lines.filter((l) => l.trim().startsWith("-"));
    const hasList = listLines.length === lines.length && lines.length > 0;

    if (hasList) {
      out.push(
        <ul key={bi} className="my-3 list-disc space-y-1 pl-6">
          {lines.map((l, li) => (
            <li key={li}>{l.replace(/^\s*-\s*/, "")}</li>
          ))}
        </ul>
      );
      return;
    }

    const children: ReactNode[] = [];
    lines.forEach((line, li) => {
      if (line.startsWith("## ")) {
        children.push(
          <h3 key={li} className="mt-4 mb-1 font-semibold">
            {line.slice(3)}
          </h3>
        );
      } else if (line.startsWith("- ")) {
        children.push(
          <p key={li} className="my-1 pl-4">
            • {line.slice(2)}
          </p>
        );
      } else {
        children.push(
          <p key={li} className="my-2">
            {line}
          </p>
        );
      }
    });
    out.push(
      <div key={bi} className="text-sm leading-relaxed">
        {children}
      </div>
    );
  });

  return <div>{out}</div>;
}
