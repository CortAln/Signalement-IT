import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { NextResponse } from "next/server";

/** POST /api/auth/login — connexion console admin. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body ?? {};
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!admin || !admin.active || !(await bcrypt.compare(String(password), admin.passwordHash))) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  await createSession(admin.id);
  return NextResponse.json({ ok: true, name: admin.name });
}
