import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import UserForm from "./user-form";
import UserList from "./user-list";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN])) {
    redirect("/");
  }

  const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;

  const sectorFilter = isSuperAdmin
    ? {}
    : { slug: { in: session.user.sectors } };

  const users = await prisma.user.findMany({
    where: isSuperAdmin
      ? undefined
      : {
          role: { in: [Role.EDITOR, Role.VIEWER] },
          sectors: { some: { sector: sectorFilter } }
        },
    include: { sectors: { include: { sector: true } } }
  });

  const sectors = await prisma.sector.findMany({
    where: sectorFilter,
    orderBy: { name: "asc" }
  });

  const availableRoles = isSuperAdmin
    ? Object.values(Role)
    : [Role.EDITOR, Role.VIEWER];

  const userList = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    sectors: user.sectors.map((s) => ({
      id: s.sector.id,
      name: s.sector.name,
      slug: s.sector.slug
    }))
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Utilisateurs</h2>
        <p className="text-sm text-slate-600">
          Créer et affecter des utilisateurs à des secteurs.
        </p>
      </div>

      <UserList
        users={userList}
        currentUserId={session.user.id}
        currentUserRole={session.user.role as Role}
      />

      <UserForm sectors={sectors} roles={availableRoles} />
    </div>
  );
}
