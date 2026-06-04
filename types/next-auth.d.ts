import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    customer?: {
      id: string;
      provider: "GOOGLE" | "APPLE";
    };
    adminUser?: {
      id: string;
      businessId?: string;
      email: string | null;
      name: string | null;
    };
    user?: DefaultSession["user"];
  }

  interface User {
    role?: "admin";
    businessId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    customerId?: string;
    authProvider?: "GOOGLE" | "APPLE";
    role?: "admin";
    adminUserId?: string;
    adminBusinessId?: string;
  }
}
