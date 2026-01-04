import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminLegalLevelsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session, [Role.SUPER_ADMIN])) {
    redirect("/");
  }

  const levels = await prisma.legalLevel.findMany({
    orderBy: { legalOrder: "asc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Niveaux juridiques</h2>
        <p className="text-sm text-slate-600">
          Hiérarchie juridique utilisée dans les menus des secteurs.
        </p>
      </div>

      <div className="card p-4 space-y-2">
        {levels.map((level) => (
          <div key={level.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{level.name}</p>
              <p className="text-xs text-slate-600">
                Slug: {level.slug} — Ordre légal: {level.legalOrder}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Créer un niveau juridique</h3>
        <form action="/api/legal-levels" method="post" className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalOrder">Ordre légal</Label>
            <Input id="legalOrder" name="legalOrder" type="number" min="1" required />
          </div>
          <div className="col-span-3">
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
