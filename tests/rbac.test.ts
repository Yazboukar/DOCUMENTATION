import { describe, it, expect } from "vitest";
import { assertRole, assertSectorScope } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { Session } from "next-auth";

const baseSession: Session = {
  expires: "",
  user: {
    id: "u1",
    name: "Test",
    email: "t@example.com",
    role: Role.VIEWER,
    sectors: ["agriculture"]
  }
};

describe("RBAC secteur", () => {
  it("refuse le téléchargement hors secteur pour un VIEWER", () => {
    const session = {
      ...baseSession,
      user: { ...baseSession.user, role: Role.VIEWER, sectors: ["agriculture"] }
    };
    expect(() => assertSectorScope(session, "peche")).toThrowError();
  });

  it("autorise un EDITOR à créer dans un secteur autorisé", () => {
    const session = {
      ...baseSession,
      user: { ...baseSession.user, role: Role.EDITOR, sectors: ["transhumance"] }
    };
    expect(() => assertRole(session, [Role.ADMIN, Role.EDITOR])).not.toThrow();
    expect(() => assertSectorScope(session, "transhumance")).not.toThrow();
    expect(() => assertSectorScope(session, "peche")).toThrowError();
  });
});
