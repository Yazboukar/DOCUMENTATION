import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.preprocess(
    (val) => (typeof val === "string" ? val.toUpperCase() : val),
    z.nativeEnum(Role)
  ),
  sectors: z.preprocess((val) => {
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) return val.map((v) => String(v));
    return [String(val)];
  }, z.array(z.string()).optional())
});

export async function GET() {
  const session = await getSession();
  if (!session || !hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;

  if (isSuperAdmin) {
    const users = await prisma.user.findMany({
      include: { sectors: { include: { sector: true } } }
    });
    return NextResponse.json(users);
  }

  // Admin: ne voit que les éditeurs/lecteurs affectés à ses secteurs
  const adminSectors = session.user.sectors;
  const users = await prisma.user.findMany({
    where: {
      role: { in: [Role.EDITOR, Role.VIEWER] },
      sectors: {
        some: { sector: { slug: { in: adminSectors } } }
      }
    },
    include: { sectors: { include: { sector: true } } }
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;
  const data = await req.formData();
  const parsed = userSchema.safeParse({
    name: data.get("name"),
    email: data.get("email"),
    password: data.get("password"),
    role: data.get("role"),
    sectors: data.getAll("sectors").map(String)
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Si un admin crée un utilisateur : uniquement EDITOR/VIEWER et secteurs dans son périmètre
  const targetRole = parsed.data.role as Role;
  if (
    !isSuperAdmin &&
    targetRole !== Role.EDITOR &&
    targetRole !== Role.VIEWER
  ) {
    return NextResponse.json(
      { error: "Rôle non autorisé pour un administrateur" },
      { status: 403 }
    );
  }

  let targetSectors = parsed.data.sectors ?? [];
  if (!isSuperAdmin) {
    const allowed = new Set(session.user.sectors);
    const filtered = targetSectors.filter((slug) => allowed.has(slug));
    if (filtered.length === 0) {
      return NextResponse.json(
        { error: "Aucun secteur autorisé pour cet utilisateur" },
        { status: 400 }
      );
    }
    targetSectors = filtered;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role
    }
  });
  const sectors = targetSectors;
  if (sectors.length) {
    const sectorEntities = await prisma.sector.findMany({
      where: { slug: { in: sectors } }
    });
    const sectorIds = sectorEntities.map((s) => s.id);
    for (const sectorId of sectorIds) {
      await prisma.userSector.create({
        data: { userId: user.id, sectorId }
      });
    }
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_USER",
        entity: "User",
        entityId: user.id,
        sectorId: sectorIds[0] ?? null
      }
    });
  }
  return NextResponse.json(user, { status: 201 });
}
