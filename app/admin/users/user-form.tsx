"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Role } from "@prisma/client";

export default function UserForm({
  sectors,
  roles
}: {
  sectors: { id: number; name: string; slug: string }[];
  roles: Role[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    if (!password || password.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/users", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Erreur lors de la création.");
      setSubmitting(false);
      return;
    }

    setSuccess("Utilisateur créé avec succès.");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Créer un utilisateur</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" name="password" type="password" required />
          <p className="text-xs text-slate-500">
            8 caractères minimum (obligatoire).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rôle</Label>
          <select
            id="role"
            name="role"
            className="border rounded-md h-10 px-3 text-sm"
            required
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Secteurs autorisés</Label>
          <div className="flex flex-wrap gap-3">
            {sectors.map((sector) => (
              <label key={sector.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sectors"
                  value={sector.slug}
                  className="h-4 w-4"
                />
                {sector.name}
              </label>
            ))}
          </div>
        </div>
        {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
        {success ? (
          <p className="col-span-2 text-sm text-emerald-700">{success}</p>
        ) : null}
        <div className="col-span-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Création..." : "Créer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
