import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * PATCH /api/equipment/[id] — renommer / re-taper un équipement.
 * ⚠️ Le code n'est pas modifiable : il est encodé dans les QR déjà collés.
 * DELETE /api/equipment/[id] — ADMIN uniquement. Les incidents liés
 * conservent leur historique (equipmentId → null, onDelete: SetNull).
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireApiAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const equipment = await prisma.equipment.findUnique({ where: { id: params.id } });
  if (!equipment) return NextResponse.json({ error: "Équipement introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim().slice(0, 100);
  }
  if (typeof body.type === "string" && body.type !== equipment.type) {
    data.type = body.type;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
  }

  const updated = await prisma.equipment.update({ where: { id: params.id }, data });
  return NextResponse.json({ equipment: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireApiAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  await prisma.equipment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
