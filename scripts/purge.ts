/**
 * Purge RGPD — suppression automatique des tickets et photos.
 * À exécuter périodiquement (cron) :
 *   0 3 * * * cd /app && npm run purge
 *
 * Politique : un incident est supprimé RETENTION_MONTHS mois après sa
 * fermeture (ou après sa création s'il n'a jamais été fermé).
 * Les photos et commentaires sont supprimés en cascade.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RETENTION_MONTHS = Number(process.env.RETENTION_MONTHS || 12);

async function main() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  // Incidents fermés depuis trop longtemps, ou incidents non fermés
  // (abandonnés) créés depuis plus longtemps que la rétention.
  const expired = await prisma.incident.findMany({
    where: {
      OR: [
        { closedAt: { lte: cutoff } },
        { status: "FERME", resolvedAt: { lte: cutoff } },
        { createdAt: { lte: cutoff } },
      ],
    },
    select: { id: true, ticketNumber: true },
  });

  if (expired.length === 0) {
    console.log(`🧹 Purge : rien à supprimer (rétention ${RETENTION_MONTHS} mois).`);
    return;
  }

  console.log(
    `🧹 Purge RGPD : suppression de ${expired.length} ticket(s) et de leurs photos/commentaires :`
  );
  for (const e of expired) console.log(`   - ${e.ticketNumber}`);

  await prisma.incident.deleteMany({
    where: { id: { in: expired.map((e) => e.id) } },
  });
  console.log("✅ Purge terminée.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
