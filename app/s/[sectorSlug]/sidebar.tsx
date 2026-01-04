"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Sector, Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Session } from "next-auth";

type MenuItem = { label: string; slug: string; id: number };

export default function SectorSidebar({
  sector,
  menu,
  session
}: {
  sector: Sector;
  menu: MenuItem[];
  session: Session | null;
}) {
  const pathname = usePathname();
  const role = session?.user.role as Role | undefined;
  const adminRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR];

  const adminLinks =
    role && adminRoles.includes(role)
      ? [
          { href: `/s/${sector.slug}/admin/documents`, label: "Documents" },
          { href: `/s/${sector.slug}/admin/menu`, label: "Menu secteur" }
        ]
      : [];

  return (
    <aside className="w-72 border-r border-slate-200 bg-white px-6 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase">Secteur</p>
          <p className="text-lg font-semibold">{sector.name}</p>
        </div>
        <span
          className="w-3 h-12 rounded-full"
          style={{ backgroundColor: sector.themeAccent }}
        />
      </div>

      <div>
        <p className="text-xs uppercase text-slate-500 mb-2">
          Niveaux juridiques
        </p>
        <nav className="space-y-1">
          <SidebarLink
            href={`/s/${sector.slug}/documents`}
            active={pathname === `/s/${sector.slug}/documents`}
          >
            Tous les niveaux
          </SidebarLink>
          {menu.map((item) => (
            <SidebarLink
              key={item.id}
              href={`/s/${sector.slug}/documents?level=${item.slug}`}
              active={pathname?.includes(item.slug) ?? false}
            >
              {item.label}
            </SidebarLink>
          ))}
        </nav>
      </div>

      {adminLinks.length ? (
        <div>
          <p className="text-xs uppercase text-slate-500 mb-2">Administration</p>
          <nav className="space-y-1">
            {adminLinks.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                active={pathname === link.href}
              >
                {link.label}
              </SidebarLink>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="mt-auto">
        <p className="text-xs uppercase text-slate-500 mb-2">
          Session utilisateur
        </p>
        <div className="space-y-1 text-sm text-slate-600">
          <p>{session?.user.email}</p>
          <Badge variant="secondary">Rôle: {session?.user.role}</Badge>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-accent text-accent-foreground"
          : "text-slate-700 hover:bg-slate-100"
      )}
    >
      {children}
    </Link>
  );
}
