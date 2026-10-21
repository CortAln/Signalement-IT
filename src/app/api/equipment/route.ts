import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * POST /api/equipment — création d'un équipement (admin connecté).
 * { code, name, type, roomId }
 */
const TYPES = [
  "ECRAN",
  "PC",
  "IMPRIMANTE",
  "RESEAU",
  "TELEPHONIE",
  "VIDEOPROJ",
  "LOGICIEL",
  "ELECTRICITE",
  "AUTRE",
];

export async function POST(req: Request) {
  const admin = await requireApiAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { code, name, type, roomId } = body ?? {};

  if (!code || !name || !type || !roomId) {
    return NextResponse.json(
      { error: "Code, nom, type et salle requis." },
      { status: 400 }
    );
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Type inconnu. Types valides : ${TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Salle inconnue." }, { status: 400 });

  const normalized = String(code).trim().toUpperCase();
  const existing = await prisma.equipment.findUnique({ where: { code: normalized } });
  if (existing) {
    return NextResponse.json({ error: `Le code ${normalized} est déjà utilisé.` }, { status: 409 });
  }

  const equipment = await prisma.equipment.create({
    data: {
      code: normalized,
      name: String(name).trim().slice(0, 100),
      type,
      roomId: room.id,
    },
  });
  return NextResponse.json({ equipment });
}
