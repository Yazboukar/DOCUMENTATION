import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { z } from "zod";

const legalLevelSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  legalOrder: z.coerce.number().min(1)
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const levels = await prisma.legalLevel.findMany({
    orderBy: { legalOrder: "asc" }
  });
  return NextResponse.json(levels);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, [Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const data = await req.formData();
  const parsed = legalLevelSchema.safeParse({
    name: data.get("name"),
    slug: data.get("slug"),
    legalOrder: data.get("legalOrder")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const level = await prisma.legalLevel.create({ data: parsed.data });
  return NextResponse.json(level, { status: 201 });
}
