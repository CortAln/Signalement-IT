import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * POST /api/rooms — création d'une salle (admin connecté).
 * Le code est normalisé : majuscules, sans espace ni accent — il sert
 * d'identifiant stable dans les URL QR (/r?salle=CODE).
 */
export async function POST(req: Request) {
  const admin = await requireApiAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { code, name, building, floor } = body ?? {};

  if (!code || !name) {
    return NextResponse.json({ error: "Code et nom de salle requis." }, { status: 400 });
  }

  const normalized = String(code).trim().toUpperCase().replace(/[\s-]+/g, "");
  if (normalized.length < 2 || normalized.length > 20) {
    return NextResponse.json(
      { error: "Le code doit contenir entre 2 et 20 caractères (lettres/chiffres)." },
      { status: 400 }
    );
  }

  const existing = await prisma.room.findUnique({ where: { code: normalized } });
  if (existing) {
    return NextResponse.json({ error: `Le code ${normalized} est déjà utilisé.` }, { status: 409 });
  }

  const room = await prisma.room.create({
    data: {
      code: normalized,
      name: String(name).trim().slice(0, 100),
      building: building ? String(building).trim().slice(0, 100) : null,
      floor: floor ? String(floor).trim().slice(0, 20) : null,
    },
  });
  return NextResponse.json({ room });
}
