"use server";

import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Slug URL à partir d'un titre (accents retirés, minuscules). */
function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "article";
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base;
  let n = 1;
  for (;;) {
    const existing = await prisma.knowledgeArticle.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function guard() {
  const admin = await requireApiAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role === "LECTEUR") redirect("/admin/kb?error=lecture-seule");
  return admin;
}

export async function createArticle(formData: FormData): Promise<void> {
  await guard();
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const category = String(formData.get("category") ?? "GENERAL").trim() || "GENERAL";
  const keywords = String(formData.get("keywords") ?? "").trim().slice(0, 300);
  const content = String(formData.get("content") ?? "").trim().slice(0, 20000);
  const published = formData.get("published") === "on";

  if (!title || !content) {
    redirect("/admin/kb/nouveau?error=champs");
  }

  const article = await prisma.knowledgeArticle.create({
    data: {
      slug: await uniqueSlug(slugify(title)),
      title,
      category,
      keywords,
      content,
      published,
    },
  });
  revalidatePath("/kb");
  revalidatePath("/admin/kb");
  redirect(`/admin/kb/${article.id}?created=1`);
}

export async function updateArticle(formData: FormData): Promise<void> {
  await guard();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const category = String(formData.get("category") ?? "GENERAL").trim() || "GENERAL";
  const keywords = String(formData.get("keywords") ?? "").trim().slice(0, 300);
  const content = String(formData.get("content") ?? "").trim().slice(0, 20000);
  const published = formData.get("published") === "on";

  const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!existing) redirect("/admin/kb?error=introuvable");

  // Si le titre change, on régénère le slug seulement s'il n'est pas encore publié
  let slug = existing.slug;
  if (title && title !== existing.title) {
    slug = await uniqueSlug(slugify(title), id);
  }

  await prisma.knowledgeArticle.update({
    where: { id },
    data: {
      title: title || existing.title,
      category,
      keywords,
      content: content || existing.content,
      published,
      slug,
    },
  });
  revalidatePath("/kb");
  revalidatePath(`/kb/${slug}`);
  revalidatePath("/admin/kb");
  redirect(`/admin/kb/${id}?saved=1`);
}

export async function togglePublish(formData: FormData): Promise<void> {
  await guard();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!existing) redirect("/admin/kb");
  await prisma.knowledgeArticle.update({
    where: { id },
    data: { published: !existing.published },
  });
  revalidatePath("/kb");
  revalidatePath("/admin/kb");
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await guard();
  const id = String(formData.get("id") ?? "");
  await prisma.knowledgeArticle.delete({ where: { id } }).catch(() => {});
  revalidatePath("/kb");
  revalidatePath("/admin/kb");
  redirect("/admin/kb?deleted=1");
}
