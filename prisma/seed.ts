import { PrismaClient, Severity } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clean up existing seed data ─────────────────────────────────────────────
  await prisma.timelineEntry.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.note.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany({ where: { email: "test@netfusion.dev" } });

  // ── User ────────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.create({
    data: {
      email: "test@netfusion.dev",
      passwordHash,
      name: "Test Analyst",
      role: "ANALYST",
    },
  });
  console.log(`✅ User created: ${user.email}`);

  // ── Project ─────────────────────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      name: "Internal Network Audit",
      description: "Q2 audit of the internal corporate network infrastructure.",
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });
  console.log(`✅ Project created: ${project.name}`);

  // ── Assets ──────────────────────────────────────────────────────────────────
  const asset1 = await prisma.asset.create({
    data: {
      projectId: project.id,
      type: "server",
      ip: "192.168.1.1",
      hostname: "gateway.internal",
      tags: ["gateway", "critical"],
      notes: "Primary network gateway. Runs pfSense.",
    },
  });
  console.log(`✅ Asset created: ${asset1.ip}`);

  const asset2 = await prisma.asset.create({
    data: {
      projectId: project.id,
      type: "workstation",
      ip: "192.168.1.42",
      hostname: "dev-ws-01.internal",
      tags: ["workstation", "dev"],
      notes: "Developer workstation. Windows 11.",
    },
  });
  console.log(`✅ Asset created: ${asset2.ip}`);

  // ── Finding ─────────────────────────────────────────────────────────────────
  const finding = await prisma.finding.create({
    data: {
      projectId: project.id,
      assetId: asset1.id,
      type: "SQL Injection",
      severity: Severity.CRITICAL,
      description:
        "Unauthenticated SQL injection found in the admin login endpoint at /admin/login. " +
        "Allows full database read/write access without credentials.",
    },
  });
  console.log(`✅ Finding created: [${finding.severity}] ${finding.type}`);

  // ── Timeline entries ─────────────────────────────────────────────────────────
  await prisma.timelineEntry.createMany({
    data: [
      {
        projectId: project.id,
        userId: user.id,
        action: `Asset ${asset1.ip} was added`,
        metadata: { model: "Asset", operation: "create", recordId: asset1.id },
      },
      {
        projectId: project.id,
        userId: user.id,
        action: `Asset ${asset2.ip} was added`,
        metadata: { model: "Asset", operation: "create", recordId: asset2.id },
      },
      {
        projectId: project.id,
        userId: user.id,
        action: `Finding [${finding.severity}] ${finding.type} was created`,
        metadata: { model: "Finding", operation: "create", recordId: finding.id },
      },
    ],
  });
  console.log("✅ Timeline entries created");

  console.log("\n🎉 Seed complete.");
  console.log("   Email:    test@netfusion.dev");
  console.log("   Password: password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
