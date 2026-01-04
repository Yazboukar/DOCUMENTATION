import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope, hasRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function AdminDocumentsPage({
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
  if (!hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR])) {
    redirect(`/s/${params.sectorSlug}/documents`);
  }

  const legalLevels = await prisma.sectorLegalLevel.findMany({
    where: { sector: { slug: params.sectorSlug }, isVisible: true },
    include: { legalLevel: true },
    orderBy: [
      { orderOverride: "asc" },
      { legalLevel: { legalOrder: "asc" } }
    ]
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gérer les documents</h1>
          <p className="text-sm text-slate-600">
            Ajouter un document PDF et définir ses métadonnées.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Créer un document</h2>
        <form
          action="/api/documents"
          method="post"
          className="grid grid-cols-2 gap-4"
          encType="multipart/form-data"
        >
          <input type="hidden" name="sectorSlug" value={params.sectorSlug} />
          <div className="col-span-2 space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" />
          </div>
          <div className="col-span-1 space-y-2">
            <Label htmlFor="referenceNumber">Référence</Label>
            <Input id="referenceNumber" name="referenceNumber" />
          </div>
          <div className="col-span-1 space-y-2">
            <Label htmlFor="year">Année</Label>
            <Input id="year" name="year" type="number" min="1900" />
          </div>
          <div className="col-span-1 space-y-2">
            <Label htmlFor="legalLevelId">Niveau juridique</Label>
            <select
              id="legalLevelId"
              name="legalLevelId"
              className="border rounded-md h-10 px-3 text-sm w-full"
              required
            >
              <option value="">Choisir...</option>
              {legalLevels.map((c) => (
                <option key={c.legalLevelId} value={c.legalLevelId}>
                  {c.labelOverride || c.legalLevel.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1 space-y-2">
            <Label htmlFor="file">Fichier PDF (max 20MB)</Label>
            <Input id="file" name="file" type="file" accept="application/pdf" required />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="keywords">Mots clés (séparés par virgule)</Label>
            <Input id="keywords" name="keywords" />
          </div>
          <div className="col-span-2">
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
