import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "sit_session";
const SESSION_DAYS = 7;

export async function createSession(adminId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await prisma.session.create({ data: { token, adminId, expiresAt } });
  const jar = cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

/** Retourne l'admin connecté, ou null. À utiliser dans les pages/layout server. */
export async function getCurrentAdmin() {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { admin: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.admin;
}

/** Variante pour les routes API : renvoie null si non authentifié. */
export async function requireApiAdmin() {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { admin: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.admin;
}
