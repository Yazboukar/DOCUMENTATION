import { getSession } from "@/lib/session";
import { assertSectorScope } from "@/lib/rbac";
import { getSectorMenu } from "@/lib/menu";
import { prisma } from "@/lib/prisma";
import { SectorThemeProvider } from "@/lib/sectorTheme";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import SectorSidebar from "./sidebar";
import SignOutButton from "@/components/sign-out-button";

export default async function SectorLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { sectorSlug: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    assertSectorScope(session, params.sectorSlug);
  } catch {
    redirect("/");
  }
  const sector = await prisma.sector.findUnique({
    where: { slug: params.sectorSlug }
  });
  if (!sector) redirect("/");
  const menu = await getSectorMenu(params.sectorSlug);

  return (
    <SectorThemeProvider sectorSlug={params.sectorSlug}>
      <div className="min-h-screen flex">
        <SectorSidebar sector={sector} menu={menu} session={session} />
        <div className="flex-1 bg-slate-50">
          <header className="flex items-center justify-between px-8 py-6 border-b border-slate-200">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Secteur
              </p>
              <h1 className="text-xl font-semibold">{sector.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/?reset=1"
                className="text-sm text-primary hover:underline font-medium"
              >
                Changer de secteur
              </Link>
              <SignOutButton />
            </div>
          </header>
          <main className="p-8">{children}</main>
        </div>
      </div>
    </SectorThemeProvider>
  );
}
