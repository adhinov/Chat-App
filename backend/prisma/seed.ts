import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123";

  // cek apakah admin sudah ada
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Admin already exists.");
    return;
  }

  // hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // buat admin baru
  await prisma.user.create({
    data: {
      email: adminEmail,
      username: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Admin created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
