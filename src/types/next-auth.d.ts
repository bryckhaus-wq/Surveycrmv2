import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      spokeId?: string | null;
      name?: string | null;
      email?: string | null;
    };
  }
}
