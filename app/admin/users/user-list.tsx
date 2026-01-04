"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Role } from "@prisma/client";

type UserListProps = {
  users: {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    sectors: { id: number; name: string; slug: string }[];
  }[];
  currentUserId: string;
  currentUserRole: Role;
};

export default function UserList({
  users,
  currentUserId,
  currentUserRole
}: UserListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleStatus(userId: string, isActive: boolean, name: string) {
    setError(null);
    let reason: string | undefined;
    if (isActive) {
      const input = prompt(`Motif de désactivation pour ${name} :`);
      if (input === null) return;
      const trimmed = input.trim();
      if (!trimmed) {
        setError("Un motif est requis pour désactiver un compte.");
        return;
      }
      reason = trimmed;
    }

    setLoadingId(userId);
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive, reason })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Impossible de mettre à jour ce compte.");
    } else {
      router.refresh();
    }
    setLoadingId(null);
  }

  async function deleteUser(userId: string, name: string) {
    setError(null);
    const input = prompt(`Motif de suppression pour ${name} :`);
    if (input === null) return;
    const reason = input.trim();
    if (!reason) {
      setError("Un motif est requis pour supprimer un compte.");
      return;
    }
    if (!confirm(`Supprimer le compte de ${name} ?`)) return;
    setLoadingId(userId);
    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Impossible de supprimer ce compte.");
    } else {
      router.refresh();
    }
    setLoadingId(null);
  }

  if (!users.length) {
    return <div className="card p-4 text-sm text-slate-600">Aucun utilisateur.</div>;
  }

  return (
    <div className="card p-4 space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        const disableSelfSuperAdmin =
          isSelf && user.role === Role.SUPER_ADMIN;
        const sectorList = user.sectors.map((s) => s.name).join(", ") || "Aucun";

        return (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
          >
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-slate-600">
                {user.email} — {user.role}
              </p>
              <p className="text-xs text-slate-600">Secteurs: {sectorList}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs rounded-full bg-slate-100 border">
                {user.isActive ? "Actif" : "Inactif"}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingId === user.id || disableSelfSuperAdmin}
                onClick={() => toggleStatus(user.id, user.isActive, user.name)}
              >
                {user.isActive ? "Désactiver" : "Activer"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={
                  loadingId === user.id ||
                  disableSelfSuperAdmin ||
                  (user.role === Role.SUPER_ADMIN &&
                    currentUserRole !== Role.SUPER_ADMIN)
                }
                onClick={() => deleteUser(user.id, user.name)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
