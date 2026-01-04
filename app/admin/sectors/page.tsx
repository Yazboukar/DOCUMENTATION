import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminSectorsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session, [Role.SUPER_ADMIN])) {
    redirect("/");
  }

  const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Secteurs</h2>
          <p className="text-sm text-slate-600">
            Ajouter ou modifier les secteurs et leurs thèmes.
          </p>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        {sectors.map((sector) => (
          <div key={sector.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{sector.name}</p>
              <p className="text-xs text-slate-600">Slug: {sector.slug}</p>
            </div>
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: sector.themeAccent }}
              title={sector.themeAccent}
            />
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Créer un secteur</h3>
        <form action="/api/sectors" method="post" className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="themeAccent">Accent (hex)</Label>
            <Input id="themeAccent" name="themeAccent" defaultValue="#1E5AA8" required />
          </div>
          <div className="col-span-3">
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
