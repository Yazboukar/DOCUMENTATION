import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope, hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  try {
    assertSectorScope(session, params.slug);
  } catch {
    return NextResponse.json({ error: "Secteur non autorisé" }, { status: 403 });
  }
  const sector = await prisma.sector.findUnique({
    where: { slug: params.slug },
    include: {
      legalLevels: {
        where: { isVisible: true },
        include: { legalLevel: true },
        orderBy: [
          { orderOverride: "asc" },
          { legalLevel: { legalOrder: "asc" } }
        ]
      }
    }
  });
  if (!sector) return NextResponse.json({ error: "Secteur introuvable" }, { status: 404 });
  const menu = sector.legalLevels.map((item) => ({
    label: item.labelOverride || item.legalLevel.name,
    slug: item.legalLevel.slug,
    id: item.legalLevelId,
    order: item.orderOverride ?? item.legalLevel.legalOrder
  }));
  return NextResponse.json(menu);
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getSession();
  if (!session || !hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  try {
    assertSectorScope(session, params.slug);
  } catch {
    return NextResponse.json({ error: "Secteur non autorisé" }, { status: 403 });
  }
  const data = await req.formData();
  const entries = Array.from(data.entries())
    .filter(([key]) => key.startsWith("items"))
    .reduce<Record<number, Record<string, string | boolean>>>((acc, [key, value]) => {
      const match = key.match(/items\[(\d+)\]\[(.+)\]/);
      if (!match) return acc;
      const index = Number(match[1]);
      const field = match[2];
      if (!acc[index]) acc[index] = {};
      acc[index][field] = value === "on" ? true : String(value);
      return acc;
    }, {});

  const sector = await prisma.sector.findUnique({ where: { slug: params.slug } });
  if (!sector) {
    return NextResponse.json({ error: "Secteur introuvable" }, { status: 404 });
  }

  for (const item of Object.values(entries)) {
    const legalLevelId = Number(item.legalLevelId);
    if (!legalLevelId) continue;
    await prisma.sectorLegalLevel.upsert({
      where: {
        sectorId_legalLevelId: { sectorId: sector.id, legalLevelId }
      },
      create: {
        sectorId: sector.id,
        legalLevelId,
        orderOverride: item.order ? Number(item.order) : null,
        labelOverride: item.labelOverride ? String(item.labelOverride) : null,
        isVisible: item.isVisible === true || item.isVisible === "true" || item.isVisible === "on"
      },
      update: {
        orderOverride: item.order ? Number(item.order) : null,
        labelOverride: item.labelOverride ? String(item.labelOverride) : null,
        isVisible: item.isVisible === true || item.isVisible === "true" || item.isVisible === "on"
      }
    });
  }

  return NextResponse.json({ ok: true });
}
