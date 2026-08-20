import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/server/db/prisma";
import { canSignInToCrm } from "./access";
import { credentialsSchema } from "./credentials";
import { verifyPassword } from "./password";

export const authConfig = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsedCredentials.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
          },
        });

        if (!user?.passwordHash || !await verifyPassword(parsedCredentials.data.password, user.passwordHash)) {
          return null;
        }

        if (!await canSignInToCrm(user.id)) {
          return null;
        }

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
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
