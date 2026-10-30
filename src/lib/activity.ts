import { prisma } from "@/lib/prisma";

/**
 * Journal d'activité d'un ticket (audit trail).
 * Toujours best-effort : un échec de journalisation ne doit jamais
 * faire échouer l'action principale.
 */
export async function logActivity(
  incidentId: string,
  action: string,
  actorName: string,
  details?: string | null
): Promise<void> {
  await prisma.activityLog
    .create({
      data: {
        incidentId,
        action,
        actorName,
        details: details ? details.slice(0, 500) : null,
      },
    })
    .catch((err) => console.error("logActivity", err));
}
