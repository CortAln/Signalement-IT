import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * PATCH /api/rooms/[id] — renommer une salle ou changer bâtiment/étage.
 * ⚠️ Le code n'est pas modifiable ici : il est encodé dans les QR codes
 * déjà imprimés. En cas d'erreur de code, créer une nouvelle salle.
 * DELETE /api/rooms/[id] — ADMIN uniquement. Refusé si des incidents
 * y sont rattachés (les équipements sont supprimés en cascade).
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireApiAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const room = await prisma.room.findUnique({ where: { id: params.id } });
  if (!room) return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim().slice(0, 100);
  }
  if ("building" in body) {
    data.building = body.building ? String(body.building).trim().slice(0, 100) : null;
  }
  if ("floor" in body) {
    data.floor = body.floor ? String(body.floor).trim().slice(0, 20) : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
  }

  const updated = await prisma.room.update({ where: { id: params.id }, data });
  return NextResponse.json({ room: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireApiAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const incidentCount = await prisma.incident.count({ where: { roomId: params.id } });
  if (incidentCount > 0) {
    return NextResponse.json(
      {
        error: `Impossible : ${incidentCount} incident(s) rattaché(s) à cette salle. Supprimez-les d'abord (ou gardez la salle pour l'historique).`,
      },
      { status: 409 }
    );
  }

  await prisma.room.delete({ where: { id: params.id } }).catch(() => {
    // FK résiduelle improbable : conflit → 409 remonté ci-dessus
  });
  return NextResponse.json({ ok: true });
}
