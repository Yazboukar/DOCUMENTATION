import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope, hasRole } from "@/lib/rbac";
import { DocumentStatus, Role } from "@prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional()
});

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
    include: { sectors: { include: { sector: true } }, legalLevel: true }
  });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const privilegedRoles: Role[] = [Role.ADMIN, Role.EDITOR, Role.SUPER_ADMIN];
  const role = session.user.role as Role;
  if (
    role !== Role.SUPER_ADMIN &&
    role !== Role.VIEWER &&
    role !== Role.EDITOR &&
    !doc.sectors.some((s) => s.sector.slug === sector)
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (
    doc.status !== DocumentStatus.PUBLISHED &&
    !privilegedRoles.includes(role)
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  return NextResponse.json(doc);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (
    !session ||
    !hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR])
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const sector = new URL(req.url).searchParams.get("sector");
  if (!sector) return NextResponse.json({ error: "Secteur requis" }, { status: 400 });
  try {
    assertSectorScope(session, sector);
  } catch {
    return NextResponse.json({ error: "Secteur non autorisé" }, { status: 403 });
  }
  const payload = await req.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const doc = await prisma.document.findUnique({
    where: { id: Number(params.id) },
    include: { sectors: { include: { sector: true } } }
  });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (
    session.user.role !== Role.SUPER_ADMIN &&
    !doc.sectors.some((s) => s.sector.slug === sector)
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const updated = await prisma.document.update({
    where: { id: Number(params.id) },
    data: parsed.data
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE_DOCUMENT",
      entity: "Document",
      entityId: String(updated.id)
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
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
  if (
    session.user.role !== Role.SUPER_ADMIN &&
    !doc.sectors.some((s) => s.sector.slug === sector)
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  await prisma.documentSector.deleteMany({ where: { documentId: doc.id } });
  await prisma.document.delete({ where: { id: doc.id } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE_DOCUMENT",
      entity: "Document",
      entityId: String(doc.id)
    }
  });
  return NextResponse.json({ ok: true });
}
