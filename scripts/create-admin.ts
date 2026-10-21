// Création d'un compte console pour la production.
// Usage :  npx tsx scripts/create-admin.ts <email> <nom> <motDePasse> [ADMIN|TECHNICIEN]
// Exemple : npx tsx scripts/create-admin.ts camille@monentreprise.fr "Camille Fabre" "MotDePasseFort!42" ADMIN
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [email, name, password, roleArg] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error(
      "Usage : npx tsx scripts/create-admin.ts <email> <nom> <motDePasse> [ADMIN|TECHNICIEN]"
    );
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("❌ Le mot de passe doit faire au moins 10 caractères.");
    process.exit(1);
  }
  const role = roleArg === "TECHNICIEN" ? "TECHNICIEN" : "ADMIN";

  const existing = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    console.error(`❌ Un compte existe déjà avec ${email}.`);
    process.exit(1);
  }

  const admin = await prisma.adminUser.create({
    data: {
      email: email.toLowerCase(),
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`✅ Compte créé : ${admin.email} (${admin.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
