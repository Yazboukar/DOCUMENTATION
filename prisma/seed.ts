import { PrismaClient, Role, DocumentStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const sectors = [
    { name: "Agriculture", slug: "agriculture", themeAccent: "#2F7D32" },
    { name: "Pêche", slug: "peche", themeAccent: "#1E5AA8" },
    { name: "Élevage", slug: "elevage", themeAccent: "#8B5A2B" },
    { name: "Transhumance", slug: "transhumance", themeAccent: "#C76B1F" },
    {
      name: "Sécurité & Souveraineté",
      slug: "securite-souverainete",
      themeAccent: "#5B3FA6"
    }
  ];

  for (const sector of sectors) {
    await prisma.sector.upsert({
      where: { slug: sector.slug },
      create: sector,
      update: { themeAccent: sector.themeAccent }
    });
  }

  const legalLevels = [
    { name: "Constitution / Textes fondamentaux", slug: "constitution", legalOrder: 1 },
    { name: "Lois", slug: "lois", legalOrder: 2 },
    { name: "Décrets", slug: "decrets", legalOrder: 3 },
    { name: "Arrêtés", slug: "arretes", legalOrder: 4 },
    { name: "Décisions", slug: "decisions", legalOrder: 5 },
    { name: "Circulaires / Notes de service", slug: "circulaires", legalOrder: 6 },
    { name: "Autres", slug: "autres", legalOrder: 7 }
  ];

  for (const level of legalLevels) {
    await prisma.legalLevel.upsert({
      where: { slug: level.slug },
      create: level,
      update: { legalOrder: level.legalOrder }
    });
  }

  const allLevels = await prisma.legalLevel.findMany();
  const levelBySlug = Object.fromEntries(
    allLevels.map((c) => [c.slug, c.id])
  );

  const sectorMenus = [
    {
      slug: "agriculture",
      levels: ["constitution", "lois", "decrets", "arretes", "decisions", "circulaires", "autres"]
    },
    {
      slug: "peche",
      levels: ["lois", "decrets", "arretes", "decisions", "circulaires", "autres"]
    },
    {
      slug: "elevage",
      levels: ["constitution", "lois", "decrets", "arretes", "decisions", "circulaires", "autres"]
    },
    {
      slug: "transhumance",
      levels: ["lois", "decrets", "arretes", "decisions", "autres"]
    },
    {
      slug: "securite-souverainete",
      levels: ["lois", "decrets", "arretes", "decisions", "circulaires"]
    }
  ];

  const sectorEntities = await prisma.sector.findMany();

  for (const menu of sectorMenus) {
    const sector = sectorEntities.find((s) => s.slug === menu.slug);
    if (!sector) continue;
    let order = 1;
    for (const levelSlug of menu.levels) {
      const legalLevelId = levelBySlug[levelSlug];
      if (!legalLevelId) continue;
      await prisma.sectorLegalLevel.upsert({
        where: {
          sectorId_legalLevelId: { sectorId: sector.id, legalLevelId }
        },
        create: {
          sectorId: sector.id,
          legalLevelId,
          orderOverride: order
        },
        update: { orderOverride: order, isVisible: true }
      });
      order += 1;
    }
  }

  const passwordHash = await bcrypt.hash("MotDePasse123!", 10);

  const users = [
    {
      name: "Super Admin",
      email: "superadmin@example.com",
      role: Role.SUPER_ADMIN,
      sectors: sectorEntities.map((s) => s.slug)
    },
    {
      name: "Admin Agriculture/Élevage",
      email: "admin@example.com",
      role: Role.ADMIN,
      sectors: ["agriculture", "elevage"]
    },
    {
      name: "Editeur Pêche",
      email: "editeur@example.com",
      role: Role.EDITOR,
      sectors: ["peche"]
    },
    {
      name: "Lecteur Transhumance",
      email: "lecteur@example.com",
      role: Role.VIEWER,
      sectors: ["transhumance"]
    }
  ];

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role
      },
      update: { role: user.role }
    });
    for (const sectorSlug of user.sectors) {
      const sector = sectorEntities.find((s) => s.slug === sectorSlug);
      if (sector) {
        await prisma.userSector.upsert({
          where: {
            userId_sectorId: { userId: created.id, sectorId: sector.id }
          },
          create: {
            userId: created.id,
            sectorId: sector.id
          },
          update: {}
        });
      }
    }
  }

  const uploadsDir = process.env.UPLOAD_DIR || "./uploads";
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const samplePath = `${uploadsDir}/${randomUUID()}.pdf`;
  fs.writeFileSync(samplePath, "PDF démo");
  const hash = randomUUID().replace(/-/g, "");
  const creator = await prisma.user.findFirst({ where: { email: "superadmin@example.com" } });
  const sampleLevel = await prisma.legalLevel.findFirst();
  if (creator && sampleLevel) {
    const doc = await prisma.document.create({
      data: {
        title: "Exemple de document",
        description: "Document de démonstration pour la plateforme.",
        status: DocumentStatus.PUBLISHED,
        keywords: "exemple, démonstration",
        filePath: samplePath,
        originalFileName: "exemple.pdf",
        fileSize: 10,
        fileHash: hash,
        legalLevelId: sampleLevel.id,
        createdById: creator.id
      }
    });

    await prisma.documentSector.create({
      data: {
        documentId: doc.id,
        sectorId: sectorEntities[0].id
      }
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
