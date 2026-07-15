import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.captureSession.findUnique({
    where: { projectId: "6a40c592-1873-4a60-afb7-57abdb51a9d2" }
  });
  console.log("Capture Session Database Keys:", Object.keys(session || {}));
  console.log("Full Session Object:", JSON.stringify(session, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
