import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import SignOutButton from "@/components/sign-out-button";

export default async function HomePage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const reset = searchParams?.reset === "1";
  const sectorCookie = cookies().get("sector")?.value;
  const canAccessAll =
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "VIEWER" ||
    session.user.role === "EDITOR";
  if (
    !reset &&
    sectorCookie &&
    (canAccessAll || session.user.sectors.includes(sectorCookie))
  ) {
    redirect(`/s/${sectorCookie}/documents`);
  }

  const sectors = await prisma.sector.findMany({
    orderBy: { name: "asc" }
  });

  const visibleSectors = canAccessAll
    ? sectors
    : sectors.filter((sector) => session.user.sectors.includes(sector.slug));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold">
              Plateforme officielle de documentation
            </h1>
            <p className="text-slate-600 mt-2">
              Sélectionnez un secteur pour accéder aux documents.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-medium">{session.user.email}</p>
              <Badge variant="secondary">Rôle: {session.user.role}</Badge>
            </div>
            <SignOutButton />
          </div>
        </header>
        {visibleSectors.length === 0 ? (
          <p className="text-slate-600">Aucun secteur autorisé pour ce compte.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSectors.map((sector) => (
              <Link
                key={sector.id}
                href={`/s/${sector.slug}/documents`}
                className="card p-6 flex flex-col gap-3 border-2 hover:shadow-soft transition"
                style={{ borderColor: sector.themeAccent }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{sector.name}</h2>
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: sector.themeAccent }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  Accéder aux documents et menus spécifiques.
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
