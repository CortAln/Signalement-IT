import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Génère un numéro de ticket unique au format INC-<année>-<séquence>.
 * Le compteur est atomique : deux créations simultanées ne peuvent pas
 * produire le même numéro.
 */
export async function nextTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await prisma.$transaction(async (tx) => {
    const counter = await tx.ticketCounter.upsert({
      where: { year },
      update: { seq: { increment: 1 } },
      create: { year, seq: 1 },
    });
    return counter.seq;
  });
  return `INC-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Jeton de suivi public (URL /t/<token>) : 22 caractères aléatoires
 * en base64url. Pas de compte requis pour consulter le ticket.
 */
export function newTrackingToken(): string {
  return crypto.randomBytes(16).toString("base64url");
}
