import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope } from "@/lib/rbac";
import { DocumentStatus, Role } from "@prisma/client";
import fs from "fs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const sector = new URL(req.url).searchParams.get("sector");
  if (!sector) return NextResponse.json({ error: "Secteur requis" }, { status: 400 });
  try {
    assertSectorScope(session, sector);
  } catch {
    return NextResponse.json({ error: "Secteur non autorisé" }, { status: 403 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: Number(params.id) },
    include: { sectors: { include: { sector: true } } }
  });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const role = session.user.role as Role;
  const inScope =
    role === Role.SUPER_ADMIN ||
    role === Role.VIEWER ||
    role === Role.EDITOR ||
    doc.sectors.some((s) => s.sector.slug === sector);
  if (!inScope) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const privilegedRoles: Role[] = [Role.ADMIN, Role.EDITOR, Role.SUPER_ADMIN];
  const canDownload =
    doc.status === DocumentStatus.PUBLISHED ||
    privilegedRoles.includes(role);
  if (!canDownload) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (!fs.existsSync(doc.filePath)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(doc.filePath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${doc.originalFileName}"`
    }
  });
}
