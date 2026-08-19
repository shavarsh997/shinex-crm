import type { DefaultSession } from "next-auth";

type UserRole = "ADMIN" | "MANAGER" | "MEMBER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}
