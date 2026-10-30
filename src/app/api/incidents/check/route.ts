import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/incidents/check?roomId=...&equipmentId=...
 * Détection de doublons : incidents encore ouverts pour la salle
 * (et l'équipement si précisé). L'utilisateur peut quand même signaler.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  const equipmentId = url.searchParams.get("equipmentId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId requis" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    roomId,
    status: { in: ["NOUVEAU", "EN_COURS", "EN_ATTENTE"] },
  };
  if (equipmentId) where.equipmentId = equipmentId;

  const open = await prisma.incident.findMany({
    where,
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      criticality: true,
      category: true,
      subIssue: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ open });
}
