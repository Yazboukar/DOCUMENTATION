import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertSectorScope, hasRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DocumentStatus, Role } from "@prisma/client";

export default async function DocumentDetailPage({
  params
}: {
  params: { sectorSlug: string; id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    assertSectorScope(session, params.sectorSlug);
  } catch {
    redirect("/");
  }

  const document = await prisma.document.findUnique({
    where: { id: Number(params.id) },
    include: {
      legalLevel: true,
      sectors: { include: { sector: true } },
      creator: true
    }
  });

  if (!document) notFound();
  const sectorSlugs = document.sectors.map((s) => s.sector.slug);
  if (
    session.user.role !== Role.SUPER_ADMIN &&
    !sectorSlugs.includes(params.sectorSlug)
  ) {
    redirect("/");
  }

  const canDownload =
    document.status === DocumentStatus.PUBLISHED ||
    hasRole(session, [Role.ADMIN, Role.EDITOR, Role.SUPER_ADMIN]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Détail du document</p>
          <h1 className="text-2xl font-semibold">{document.title}</h1>
          <div className="flex gap-2 mt-2">
            <Badge>{document.status}</Badge>
            <Badge variant="secondary">{document.legalLevel.name}</Badge>
            <Badge variant="secondary">
              Secteurs: {document.sectors.map((s) => s.sector.name).join(", ")}
            </Badge>
          </div>
        </div>
        {canDownload ? (
          <Button asChild>
            <Link
              href={`/api/documents/${document.id}/download?sector=${params.sectorSlug}`}
            >
              Télécharger
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-slate-600">
            Téléchargement réservé aux documents publiés.
          </p>
        )}
      </div>
      <div className="card p-4">
        <p className="text-sm text-slate-700">{document.description}</p>
        <dl className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <dt className="text-slate-500">Référence</dt>
            <dd className="font-medium">{document.referenceNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Année</dt>
            <dd className="font-medium">{document.year || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Mots clés</dt>
            <dd className="font-medium">{document.keywords || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Créé par</dt>
            <dd className="font-medium">{document.creator?.name || "-"}</dd>
          </div>
        </dl>
      </div>
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-2">Aperçu PDF</h2>
        <div className="border rounded-md overflow-hidden h-[600px] bg-slate-100">
          <object
            data={`/api/documents/${document.id}/download?sector=${params.sectorSlug}`}
            type="application/pdf"
            className="w-full h-full"
          >
            <p className="p-4">
              Aperçu non disponible. Vous pouvez{" "}
              <Link
                href={`/api/documents/${document.id}/download?sector=${params.sectorSlug}`}
                className="text-primary underline"
              >
                télécharger le PDF
              </Link>
              .
            </p>
          </object>
        </div>
      </div>
    </div>
  );
}
