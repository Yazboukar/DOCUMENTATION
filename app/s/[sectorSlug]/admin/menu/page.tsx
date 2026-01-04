import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope, hasRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function SectorMenuPage({
  params
}: {
  params: { sectorSlug: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    assertSectorScope(session, params.sectorSlug);
  } catch {
    redirect("/");
  }
  if (!hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN])) {
    redirect(`/s/${params.sectorSlug}/documents`);
  }

  const entries = await prisma.sectorLegalLevel.findMany({
    where: { sector: { slug: params.sectorSlug } },
    include: { legalLevel: true },
    orderBy: [
      { orderOverride: "asc" },
      { legalLevel: { legalOrder: "asc" } }
    ]
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Menu du secteur</h1>
        <p className="text-sm text-slate-600">
          Configurez l&apos;ordre, la visibilité et le libellé des niveaux juridiques
          pour ce secteur.
        </p>
      </div>

      <form
        action={`/api/sectors/${params.sectorSlug}/menu`}
        method="post"
        className="space-y-4"
      >
        {entries.map((entry, index) => (
          <div
            key={entry.legalLevelId}
            className="grid grid-cols-12 gap-4 items-center card p-4"
          >
            <div className="col-span-4">
              <p className="font-medium">{entry.legalLevel.name}</p>
              <p className="text-xs text-slate-600">
                Slug: {entry.legalLevel.slug} — Ordre légal: {entry.legalLevel.legalOrder}
              </p>
              <input
                type="hidden"
                name={`items[${index}][legalLevelId]`}
                value={entry.legalLevelId}
              />
            </div>
            <div className="col-span-3 space-y-2">
              <Label>Libellé personnalisé</Label>
              <Input
                name={`items[${index}][labelOverride]`}
                defaultValue={entry.labelOverride ?? ""}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Ordre (optionnel)</Label>
              <Input
                type="number"
                name={`items[${index}][order]`}
                defaultValue={entry.orderOverride ?? entry.legalLevel.legalOrder}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Visible</Label>
              <input
                type="checkbox"
                name={`items[${index}][isVisible]`}
                defaultChecked={entry.isVisible}
              />
            </div>
          </div>
        ))}
        <Button type="submit">Mettre à jour le menu</Button>
      </form>
    </div>
  );
}
