import { compare } from "bcryptjs";
import { CustomerAuthProvider, Prisma } from "@prisma/client";
import type { AuthOptions, Profile } from "next-auth";
import { getServerSession } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { normalizeContactEmail, normalizeContactText } from "@/lib/contact";
import { prisma } from "@/lib/prisma";

/** Provider id for the admin email/password sign-in flow. */
export const ADMIN_CREDENTIALS_PROVIDER_ID = "admin-credentials";

type SupportedOAuthProvider = "google" | "apple";

const providerMap: Record<SupportedOAuthProvider, CustomerAuthProvider> = {
  google: CustomerAuthProvider.GOOGLE,
  apple: CustomerAuthProvider.APPLE,
};

function hasConfiguredEnvValue(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !value.startsWith("replace-with-"));
}

function getConfiguredProviders() {
  const providers: AuthOptions["providers"] = [];

  // Admin email/password sign-in. Always available so the admin area is
  // protected and usable even when no customer OAuth provider is configured.
  providers.push(
    CredentialsProvider({
      id: ADMIN_CREDENTIALS_PROVIDER_ID,
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = normalizeContactEmail(credentials.email);
        const adminUser = await prisma.adminUser.findFirst({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            businessId: true,
          },
        });

        if (!adminUser) {
          return null;
        }

        const passwordMatches = await compare(credentials.password, adminUser.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          businessId: adminUser.businessId,
          role: "admin" as const,
        };
      },
    }),
  );

  if (
    hasConfiguredEnvValue(process.env.GOOGLE_CLIENT_ID) &&
    hasConfiguredEnvValue(process.env.GOOGLE_CLIENT_SECRET)
  ) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  if (
    hasConfiguredEnvValue(process.env.APPLE_CLIENT_ID) &&
    hasConfiguredEnvValue(process.env.APPLE_CLIENT_SECRET)
  ) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET,
      }),
    );
  }

  return providers;
}

function isSupportedOAuthProvider(provider: string): provider is SupportedOAuthProvider {
  return provider === "google" || provider === "apple";
}

function readProfileString(profile: Profile | undefined, key: string) {
  const profileRecord = profile as Record<string, unknown> | undefined;
  const value = profileRecord?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function upsertCustomerFromOAuth({
  provider,
  providerAccountId,
  name,
  email,
  image,
}: {
  provider: SupportedOAuthProvider;
  providerAccountId: string;
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
}) {
  const normalizedName = name ? normalizeContactText(name) : null;
  const normalizedEmail = email ? normalizeContactEmail(email) : null;
  const normalizedImage = image?.trim() || null;
  const updateData: Prisma.CustomerUpdateInput = {};

  if (normalizedName) {
    updateData.name = normalizedName;
  }

  if (normalizedEmail) {
    updateData.email = normalizedEmail;
  }

  if (normalizedImage) {
    updateData.image = normalizedImage;
  }

  return prisma.customer.upsert({
    where: {
      authProvider_providerAccountId: {
        authProvider: providerMap[provider],
        providerAccountId,
      },
    },
    create: {
      authProvider: providerMap[provider],
      providerAccountId,
      name: normalizedName,
      email: normalizedEmail,
      image: normalizedImage,
    },
    update: updateData,
  });
}

export const authOptions: AuthOptions = {
  providers: getConfiguredProviders(),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider && isSupportedOAuthProvider(account.provider)) {
        const providerAccountId = account.providerAccountId ?? readProfileString(profile, "sub");

        if (!providerAccountId) {
          throw new Error("Missing OAuth provider account id.");
        }

        const customer = await upsertCustomerFromOAuth({
          provider: account.provider,
          providerAccountId,
          name: user.name ?? readProfileString(profile, "name"),
          email: user.email ?? readProfileString(profile, "email"),
          image: user.image ?? readProfileString(profile, "picture"),
        });

        token.customerId = customer.id;
        token.authProvider = customer.authProvider;
        token.name = customer.name ?? token.name;
        token.email = customer.email ?? token.email;
        token.picture = customer.image ?? token.picture;
      }

      // Admin credentials sign-in: persist the admin identity on the token.
      if (account?.provider === ADMIN_CREDENTIALS_PROVIDER_ID && user && "role" in user) {
        const adminUser = user as { id: string; businessId?: string; role?: string };

        if (adminUser.role === "admin") {
          token.role = "admin";
          token.adminUserId = adminUser.id;
          token.adminBusinessId = adminUser.businessId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (typeof token.customerId === "string") {
        session.customer = {
          id: token.customerId,
          provider: token.authProvider === "APPLE" ? "APPLE" : "GOOGLE",
        };
      }

      if (token.role === "admin" && typeof token.adminUserId === "string") {
        session.adminUser = {
          id: token.adminUserId,
          businessId: token.adminBusinessId,
          email: typeof token.email === "string" ? token.email : null,
          name: typeof token.name === "string" ? token.name : null,
        };
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        if (new URL(url).origin === baseUrl) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },
};

export function getCustomerAuthSession() {
  return getServerSession(authOptions);
}

/** Returns the current admin session, or null if the request is not an admin. */
export async function getAdminAuthSession() {
  const session = await getServerSession(authOptions);

  return session?.adminUser ? session : null;
}
