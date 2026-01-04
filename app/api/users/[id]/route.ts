import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { z } from "zod";

const updateStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().optional()
});

async function getTargetUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { sectors: { include: { sector: true } } }
  });
}

function canManageUser(
  session: Awaited<ReturnType<typeof getSession>>,
  targetRole: Role,
  targetSectors: string[]
) {
  if (!session || !hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN])) {
    return false;
  }
  if (session.user.role === Role.SUPER_ADMIN) {
    return true;
  }
  if (targetRole !== Role.EDITOR && targetRole !== Role.VIEWER) {
    return false;
  }
  const allowed = new Set(session.user.sectors);
  return targetSectors.some((slug) => allowed.has(slug));
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const user = await getTargetUser(params.id);
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const allowed = canManageUser(
    session,
    user.role as Role,
    user.sectors.map((s) => s.sector.slug)
  );
  if (!allowed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const providedReason = parsed.data.reason?.trim() ?? "";
  if (!parsed.data.isActive && providedReason.length < 5) {
    return NextResponse.json(
      { error: "Merci de renseigner un motif pour la désactivation." },
      { status: 400 }
    );
  }
  const auditReason = providedReason.length ? providedReason : null;

  const isSelfSuperAdmin =
    session?.user.id === user.id && user.role === Role.SUPER_ADMIN;
  if (isSelfSuperAdmin && !parsed.data.isActive) {
    return NextResponse.json(
      { error: "Impossible de désactiver votre propre compte super administrateur." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: parsed.data.isActive }
  });

  await prisma.auditLog.create({
    data: {
      userId: session?.user.id ?? null,
      action: parsed.data.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entity: "User",
      entityId: user.id,
      sectorId: null,
      reason: auditReason
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const user = await getTargetUser(params.id);
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const allowed = canManageUser(
    session,
    user.role as Role,
    user.sectors.map((s) => s.sector.slug)
  );
  if (!allowed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const isSelfSuperAdmin =
    session?.user.id === user.id && user.role === Role.SUPER_ADMIN;
  if (isSelfSuperAdmin) {
    return NextResponse.json(
      { error: "Impossible de supprimer votre propre compte super administrateur." },
      { status: 400 }
    );
  }

  const createdDocuments = await prisma.document.count({
    where: { createdById: user.id }
  });
  if (createdDocuments > 0) {
    return NextResponse.json(
      {
        error:
          "Cet utilisateur a créé des documents et ne peut pas être supprimé. Désactivez-le à la place."
      },
      { status: 400 }
    );
  }

  const payload = await req.json().catch(() => null);
  const reason =
    typeof payload?.reason === "string" ? payload.reason.trim() : "";
  if (reason.length < 5) {
    return NextResponse.json(
      { error: "Merci de renseigner un motif pour la suppression." },
      { status: 400 }
    );
  }

  await prisma.userSector.deleteMany({ where: { userId: user.id } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  await prisma.auditLog.create({
    data: {
      userId: session?.user.id ?? null,
      action: "DELETE_USER",
      entity: "User",
      entityId: user.id,
      sectorId: null,
      reason
    }
  });

  return NextResponse.json({ success: true });
}
