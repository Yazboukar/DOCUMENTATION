import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope, hasRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentStatus, Role } from "@prisma/client";

export default async function DocumentsPage({
  params,
  searchParams
}: {
  params: { sectorSlug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    assertSectorScope(session, params.sectorSlug);
  } catch {
    redirect("/");
  }

  const search = (searchParams?.q as string) || "";
  const level = (searchParams?.level as string) || undefined;
  const year = searchParams?.year ? Number(searchParams.year) : undefined;
  const status =
    searchParams?.status && hasRole(session, [Role.ADMIN, Role.EDITOR])
      ? (searchParams.status as DocumentStatus)
      : undefined;

  const canEdit = hasRole(session, [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR]);

  const [documents, levels] = await Promise.all([
    prisma.document.findMany({
      where: {
        sectors: { some: { sector: { slug: params.sectorSlug } } },
        ...(level ? { legalLevel: { slug: level } } : {}),
        ...(year ? { year } : {}),
        ...(status ? { status } : {}),
        ...(!canEdit ? { status: DocumentStatus.PUBLISHED } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { keywords: { contains: search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        legalLevel: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.sectorLegalLevel.findMany({
      where: { sector: { slug: params.sectorSlug }, isVisible: true },
      include: { legalLevel: true },
      orderBy: [
        { orderOverride: "asc" },
        { legalLevel: { legalOrder: "asc" } }
      ]
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-slate-600">
            Catalogue des documents du secteur.
          </p>
        </div>
        {canEdit ? (
          <Button asChild>
            <Link href={`/s/${params.sectorSlug}/admin/documents`}>
              Gérer les documents
            </Link>
          </Button>
        ) : null}
      </div>

      <form className="card p-4 grid grid-cols-4 gap-4" method="get">
        <div className="space-y-1 col-span-2">
          <label className="text-xs uppercase text-slate-500">Recherche</label>
          <input
            name="q"
            defaultValue={search}
            placeholder="Titre ou mots clés"
            className="border rounded-md h-10 px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-slate-500">
            Niveau juridique
          </label>
          <select
            name="level"
            defaultValue={level}
            className="border rounded-md h-10 px-3 text-sm"
          >
            <option value="">Toutes</option>
            {levels.map((c) => (
              <option key={c.legalLevelId} value={c.legalLevel.slug}>
                {c.labelOverride || c.legalLevel.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-slate-500">Année</label>
          <input
            name="year"
            defaultValue={year || ""}
            type="number"
            min="1900"
            className="border rounded-md h-10 px-3 text-sm"
          />
        </div>
        {canEdit ? (
          <div className="space-y-1">
            <label className="text-xs uppercase text-slate-500">Statut</label>
            <select
              name="status"
              defaultValue={status || ""}
              className="border rounded-md h-10 px-3 text-sm"
            >
              <option value="">Tous</option>
              {Object.values(DocumentStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="col-span-4 flex justify-end">
          <Button type="submit" variant="secondary">
            Filtrer
          </Button>
        </div>
      </form>

      <div className="card p-4">
        <div className="grid grid-cols-12 text-xs uppercase text-slate-500 border-b pb-2">
          <div className="col-span-4">Titre</div>
          <div className="col-span-2">Niveau</div>
          <div className="col-span-2">Année</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-12 items-center py-3 text-sm"
            >
              <div className="col-span-4">
                <div className="font-medium">{doc.title}</div>
                <p className="text-xs text-slate-600">{doc.description}</p>
              </div>
              <div className="col-span-2">{doc.legalLevel.name}</div>
              <div className="col-span-2">{doc.year || "-"}</div>
              <div className="col-span-2">
                <Badge
                  variant={
                    doc.status === DocumentStatus.PUBLISHED
                      ? "default"
                      : doc.status === DocumentStatus.DRAFT
                      ? "secondary"
                      : "muted"
                  }
                >
                  {doc.status}
                </Badge>
              </div>
              <div className="col-span-2 text-right space-x-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/s/${params.sectorSlug}/documents/${doc.id}`}>
                    Ouvrir
                  </Link>
                </Button>
              </div>
            </div>
          ))}
          {documents.length === 0 ? (
            <p className="text-sm text-slate-600 py-6">
              Aucun document trouvé pour ces critères.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
