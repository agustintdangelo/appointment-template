import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Studio Hours",
    template: "%s | Studio Hours",
  },
  description:
    "Reusable appointment-booking template for service businesses, seeded with a nail studio demo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="min-h-full">
          <header className="border-b border-border/80 bg-surface/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-foreground">
                  Demo
                </span>
                <div>
                  <p className="font-display text-xl leading-none">Studio Hours</p>
                  <p className="text-sm text-muted">Reusable appointment template</p>
                </div>
              </Link>

              <nav className="flex items-center gap-5 text-sm font-medium text-muted">
                <Link href="/" className="transition hover:text-foreground">
                  Home
                </Link>
                <Link href="/services" className="transition hover:text-foreground">
                  Services
                </Link>
                <Link href="/book" className="transition hover:text-foreground">
                  Book
                </Link>
                <Link href="/admin/appointments" className="transition hover:text-foreground">
                  Admin
                </Link>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-border/80 bg-surface/80">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:px-6 lg:px-8">
              <p>Built as a generic appointment-booking starter for time-slot-based businesses.</p>
              <p>Demo content is vertical-specific. Core domain rules are not.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
