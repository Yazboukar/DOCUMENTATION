import { DocumentStatus, Role } from "@prisma/client";
import { Session } from "next-auth";

export function hasRole(session: Session | null, roles: Role[]) {
  if (!session?.user?.role) return false;
  return roles.includes(session.user.role as Role);
}

export function assertRole(session: Session | null, roles: Role[]) {
  if (!hasRole(session, roles)) {
    throw new Error("Accès refusé");
  }
}

export function assertSectorScope(
  session: Session | null,
  sectorSlug: string
) {
  if (!session?.user) {
    throw new Error("Non authentifié");
  }
  const role = session.user.role as Role;
  if (
    role === Role.SUPER_ADMIN ||
    role === Role.VIEWER ||
    role === Role.EDITOR
  )
    return true;
  if (!session.user.sectors?.includes(sectorSlug)) {
    throw new Error("Secteur non autorisé");
  }
  return true;
}

export function canEditStatus(
  session: Session | null,
  sectorSlug: string,
  targetStatus: DocumentStatus
) {
  if (!session) return false;
  const role = session.user.role as Role;
  if (role === Role.SUPER_ADMIN) return true;
  if (!session.user.sectors?.includes(sectorSlug)) return false;
  const editorRoles: Role[] = [Role.ADMIN, Role.EDITOR];
  return editorRoles.includes(role)
    ? true
    : targetStatus === DocumentStatus.PUBLISHED && role === Role.VIEWER;
}
