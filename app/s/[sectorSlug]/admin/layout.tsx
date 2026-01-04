import { ReactNode } from "react";

export default function SectorAdminLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="border border-dashed border-slate-200 rounded-md p-4 bg-white">
        <p className="text-sm text-slate-600">
          Espace administrateur : gestion des documents, menus et ressources du
          secteur.
        </p>
      </div>
      {children}
    </div>
  );
}
