import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { z } from "zod";

const sectorSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  themeAccent: z.string().min(4)
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(sectors);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, [Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const data = await req.formData();
  const parsed = sectorSchema.safeParse({
    name: data.get("name"),
    slug: data.get("slug"),
    themeAccent: data.get("themeAccent")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const sector = await prisma.sector.create({ data: parsed.data });
  return NextResponse.json(sector, { status: 201 });
}
