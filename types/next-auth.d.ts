import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    customer?: {
      id: string;
      provider: "GOOGLE" | "APPLE";
    };
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    customerId?: string;
    authProvider?: "GOOGLE" | "APPLE";
  }
}
