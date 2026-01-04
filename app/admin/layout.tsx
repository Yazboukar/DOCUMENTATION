import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <p className="text-xs uppercase text-slate-500">Administration</p>
            <h1 className="text-2xl font-semibold">
              Gestion globale de la plateforme
            </h1>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
