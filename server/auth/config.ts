import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { prisma } from "@/server/db/prisma";
import { canSignInToCrm } from "./access";

export const authConfig = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) {
        return false;
      }

      return canSignInToCrm(user.id);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const databaseUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = databaseUser?.role ?? user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
