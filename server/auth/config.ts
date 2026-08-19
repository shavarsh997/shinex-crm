import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";

import { prisma } from "@/server/db/prisma";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [],
  session: {
    strategy: "database",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
