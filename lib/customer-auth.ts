import { CustomerAuthProvider, Prisma } from "@prisma/client";
import type { AuthOptions, Profile } from "next-auth";
import { getServerSession } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";

import { normalizeContactEmail, normalizeContactText } from "@/lib/contact";
import { prisma } from "@/lib/prisma";

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

      return token;
    },
    async session({ session, token }) {
      if (typeof token.customerId === "string") {
        session.customer = {
          id: token.customerId,
          provider: token.authProvider === "APPLE" ? "APPLE" : "GOOGLE",
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
