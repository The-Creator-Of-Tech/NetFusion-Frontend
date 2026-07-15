import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const columns: any = await prisma.$queryRawUnsafe(`DESCRIBE CaptureSession`);
  console.log("CaptureSession Columns:");
  console.log(columns);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
