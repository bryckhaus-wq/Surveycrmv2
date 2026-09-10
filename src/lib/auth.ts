import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const cleanEmail = credentials.email.toLowerCase().trim();
        const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.toLowerCase().trim();
        const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        const defaultAdminName = process.env.DEFAULT_ADMIN_NAME || "System Administrator";

        // Check if matching environment-defined default admin credentials
        if (
          defaultAdminEmail &&
          defaultAdminPassword &&
          cleanEmail === defaultAdminEmail &&
          credentials.password === defaultAdminPassword
        ) {
          let adminUser = await prisma.user.findUnique({
            where: { email: defaultAdminEmail },
          });

          if (!adminUser) {
            const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
            adminUser = await prisma.user.create({
              data: {
                email: defaultAdminEmail,
                name: defaultAdminName,
                role: "ADMIN",
                isActive: true,
                password: hashedPassword,
              },
            });
          } else {
            // Keep active and ensure ADMIN role
            if (!adminUser.isActive || adminUser.role !== "ADMIN") {
              adminUser = await prisma.user.update({
                where: { id: adminUser.id },
                data: { isActive: true, role: "ADMIN" },
              });
            }
          }

          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            spokeId: adminUser.spokeId,
          };
        }

        const user = await prisma.user.findUnique({
          where: {
            email: cleanEmail,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          spokeId: user.spokeId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.spokeId = (user as any).spokeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.spokeId = token.spokeId as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "mjs-survey-super-secret-key-change-in-prod",
};
