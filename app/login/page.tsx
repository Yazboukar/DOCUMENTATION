import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 flex flex-col lg:flex-row gap-10 items-center">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Accès sécurisé aux documents ministériels
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            Plateforme documentaire
            <span className="block text-emerald-300">Connexion requise</span>
          </h1>
          <p className="text-slate-200 max-w-2xl">
            Authentifiez-vous pour consulter, déposer et administrer les documents
            selon votre périmètre et vos droits d’accès.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Secteurs</p>
              <p className="text-slate-300 mt-1">Thématisation et périmètre garantis.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Contrôles</p>
              <p className="text-slate-300 mt-1">RBAC, statuts, journaux d’audit.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">PDF sécurisés</p>
              <p className="text-slate-300 mt-1">Validation de statut avant téléchargement.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 w-full">
          <div className="card w-full max-w-lg ml-auto bg-white text-slate-900 p-8 shadow-2xl shadow-emerald-500/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Espace réservé</p>
                <p className="text-xl font-semibold">Connexion</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Sécurisé
              </span>
            </div>
            <LoginForm />
            <p className="mt-4 text-sm text-slate-500">
              Besoin d’un accès ? Contactez l’administrateur de votre secteur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
