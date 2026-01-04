import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope, hasRole } from "@/lib/rbac";
import { DocumentStatus, Role } from "@prisma/client";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { randomUUID, createHash } from "crypto";

const documentSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  referenceNumber: z.string().optional(),
  year: z.string().optional(),
  legalLevelId: z.string(),
  keywords: z.string().optional(),
  sectorSlug: z.string(),
  sectors: z.array(z.string()).optional()
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const sectorSlug = searchParams.get("sector");
  if (!sectorSlug) {
    return NextResponse.json({ error: "Secteur requis" }, { status: 400 });
  }
  try {
    assertSectorScope(session, sectorSlug);
  } catch {
    return NextResponse.json({ error: "Secteur non autorisé" }, { status: 403 });
  }
  const status = searchParams.get("status") as DocumentStatus | null;
  const year = searchParams.get("year");
  const legalLevel = searchParams.get("level");
  const q = searchParams.get("q");

  const statusFilter =
    hasRole(session, [Role.ADMIN, Role.EDITOR, Role.SUPER_ADMIN])
      ? undefined
      : DocumentStatus.PUBLISHED;

  const documents = await prisma.document.findMany({
    where: {
      sectors: { some: { sector: { slug: sectorSlug } } },
      ...(status ? { status } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(year ? { year: Number(year) } : {}),
      ...(legalLevel ? { legalLevel: { slug: legalLevel } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { keywords: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { legalLevel: true }
  });

  return NextResponse.json(documents);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (
    !session ||
    !hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR])
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const form = await req.formData();
  const parsed = documentSchema.safeParse({
    title: form.get("title"),
    description: form.get("description"),
    referenceNumber: form.get("referenceNumber"),
    year: form.get("year"),
    legalLevelId: form.get("legalLevelId"),
    keywords: form.get("keywords"),
    sectorSlug: form.get("sectorSlug"),
    sectors: form.getAll("sectors").map(String)
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    assertSectorScope(session, parsed.data.sectorSlug);
  } catch {
    return NextResponse.json({ error: "Secteur non autorisé" }, { status: 403 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF uniquement" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const maxSize = 20 * 1024 * 1024;
  if (buffer.length > maxSize) {
    return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 400 });
  }
  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  fs.mkdirSync(uploadDir, { recursive: true });
  const fileName = `${randomUUID()}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);
  const hash = createHash("sha256").update(buffer).digest("hex");

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      referenceNumber: parsed.data.referenceNumber,
      year: parsed.data.year ? Number(parsed.data.year) : null,
      status: DocumentStatus.DRAFT,
      keywords: parsed.data.keywords,
      filePath,
      originalFileName: file.name,
      fileSize: buffer.length,
      fileHash: hash,
      legalLevelId: Number(parsed.data.legalLevelId),
      createdById: session.user.id
    }
  });

  const sectorSlugs =
    parsed.data.sectors && parsed.data.sectors.length
      ? parsed.data.sectors
      : [parsed.data.sectorSlug];
  const sectorEntities = await prisma.sector.findMany({
    where: { slug: { in: sectorSlugs } }
  });
  for (const sector of sectorEntities) {
    await prisma.documentSector.create({
      data: { documentId: document.id, sectorId: sector.id }
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_DOCUMENT",
      entity: "Document",
      entityId: String(document.id),
      sectorId: sectorEntities[0]?.id
    }
  });

  return NextResponse.json(document, { status: 201 });
}
