import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Buat user manual (tanpa fitur register di UI).
// Usage: npm run create-user -- "username" "password"
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Gunakan: npm run create-user -- <username> <password>");
    process.exit(1);
  }
  const [username, password] = args;
  if (!username || !password) {
    console.log("Username dan password wajib diisi");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`User "${username}" sudah ada.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash },
  });
  console.log(`✅ User dibuat: ${user.username} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
