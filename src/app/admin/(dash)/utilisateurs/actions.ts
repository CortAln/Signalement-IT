"use server";

import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const ROLES = ["ADMIN", "TECHNICIEN", "LECTEUR"];

async function guardAdmin() {
  const admin = await requireApiAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin?error=forbidden");
  return admin;
}

export async function createUser(formData: FormData): Promise<void> {
  await guardAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(formData.get("password") ?? "");
  const role = ROLES.includes(String(formData.get("role"))) ? String(formData.get("role")) : "TECHNICIEN";

  if (!name || !email || password.length < 8) {
    redirect("/admin/utilisateurs?error=champs");
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/utilisateurs?error=email-existant");
  }

  await prisma.adminUser.create({
    data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/admin/utilisateurs");
  redirect("/admin/utilisateurs?created=1");
}

export async function updateUser(formData: FormData): Promise<void> {
  await guardAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const role = ROLES.includes(String(formData.get("role"))) ? String(formData.get("role")) : undefined;
  const newPassword = String(formData.get("newPassword") ?? "");
  const active = formData.get("active") === "on";

  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) redirect("/admin/utilisateurs?error=introuvable");

  const data: Record<string, unknown> = {};
  if (name && name !== user.name) data.name = name;
  if (role && role !== user.role) data.role = role;
  if (active !== user.active) {
    data.active = active;
    if (!active) {
      // Déconnecte immédiatement l'utilisateur désactivé
      await prisma.session.deleteMany({ where: { adminId: id } }).catch(() => {});
    }
  }
  if (newPassword) {
    if (newPassword.length < 8) redirect("/admin/utilisateurs?error=mdp-court");
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length > 0) {
    await prisma.adminUser.update({ where: { id }, data });
  }
  revalidatePath("/admin/utilisateurs");
  redirect("/admin/utilisateurs?saved=1");
}
