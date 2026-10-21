import { prisma } from "@/lib/prisma";
import { nextTicketNumber, newTrackingToken } from "@/lib/ticket";
import { notifyNewIncident } from "@/lib/notify";
import { requireApiAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * POST /api/incidents — création publique d'un signalement.
 * Aucune authentification requise (RGPD : données minimales).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomId,
      equipmentId,
      category,
      subIssue,
      description,
      criticality,
      reporterName,
      reporterEmail,
      workstationRef,
      photos = [],
    } = body ?? {};

    if (!roomId || !category || !criticality) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants (salle, catégorie, criticité)." },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "Salle inconnue." }, { status: 400 });
    }

    let equipment = null;
    if (equipmentId) {
      equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
      if (!equipment) {
        return NextResponse.json({ error: "Équipement inconnu." }, { status: 400 });
      }
    }

    // Nettoyage basique des données personnelles (RGPD : minimisation)
    const clean = (v: unknown) =>
      typeof v === "string" ? v.trim().slice(0, 200) : null;

    const incident = await prisma.incident.create({
      data: {
        ticketNumber: await nextTicketNumber(),
        token: newTrackingToken(),
        criticality,
        category,
        subIssue: clean(subIssue),
        description: typeof description === "string" ? description.trim().slice(0, 2000) : null,
        reporterName: clean(reporterName) || null,
        reporterEmail: clean(reporterEmail) || null,
        workstationRef: clean(workstationRef) || null,
        roomId: room.id,
        equipmentId: equipment?.id ?? null,
        photos: {
          create: photos
            .filter((p: { data?: string; mime?: string }) => p?.data && p?.mime)
            .slice(0, 3)
            .map((p: { data: string; mime: string }) => ({ data: p.data, mime: p.mime })),
        },
      },
      include: { room: true, equipment: true, photos: true },
    });

    // Notifications asynchrones : ne pas bloquer la réponse (< 2 s objectif)
    notifyNewIncident(incident).catch((err) => console.error("notification", err));

    return NextResponse.json({
      ticketNumber: incident.ticketNumber,
      token: incident.token,
      trackingUrl: `/t/${incident.token}`,
    });
  } catch (err) {
    console.error("POST /api/incidents", err);
    return NextResponse.json(
      { error: "Une erreur est survenue. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents — liste filtrée (réservée à la console admin).
 * Filtres : statut, catégorie, salle, criticité, recherche plein texte.
 */
export async function GET(req: Request) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const roomId = url.searchParams.get("roomId") || undefined;
  const criticality = url.searchParams.get("criticality") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const open = url.searchParams.get("open");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (roomId) where.roomId = roomId;
  if (criticality) where.criticality = criticality;
  if (open === "1") where.status = { in: ["NOUVEAU", "EN_COURS"] };
  if (q) {
    where.OR = [
      { ticketNumber: { contains: q } },
      { description: { contains: q } },
      { subIssue: { contains: q } },
      { reporterName: { contains: q } },
      { workstationRef: { contains: q } },
    ];
  }

  const incidents = await prisma.incident.findMany({
    where,
    include: { room: true, equipment: true, assignedTo: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ incidents });
}
