import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import NextAuth, {
  DefaultSession,
  NextAuthOptions,
  getServerSession
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { z } from "zod";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      sectors: string[];
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: { sectors: { include: { sector: true } } }
        });
        if (!user || !user.isActive) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async session({ session, token, user }) {
      const userId = user?.id ?? (typeof token.sub === "string" ? token.sub : null);
      if (!userId) return session;
      const userWithSectors = await prisma.user.findUnique({
        where: { id: userId },
        include: { sectors: { include: { sector: true } } }
      });
      session.user = {
        ...session.user,
        id: userId,
        role: userWithSectors?.role ?? "VIEWER",
        sectors:
          userWithSectors?.sectors.map((s) => s.sector.slug) ?? []
      };
      return session;
    }
  }
};

/**
 * Helper pour récupérer la session côté serveur (App Router).
 */
export function auth() {
  return getServerSession(authOptions);
}
