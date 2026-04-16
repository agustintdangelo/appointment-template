import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { buildBrandAssetUrl, buildBrandingCssVariables } from "@/lib/branding";
import { getPublicBranding } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBranding();
  const businessName = branding?.name ?? "Appointment Template";
  const favicon = branding?.brandAssets.find((asset) => asset.kind === "FAVICON");

  return {
    title: {
      default: businessName,
      template: `%s | ${businessName}`,
    },
    description:
      branding?.description ??
      "Reusable appointment-booking template for service businesses.",
    icons: favicon
      ? {
          icon: [
            {
              url: buildBrandAssetUrl(favicon) ?? "/favicon.ico",
              type: favicon.mimeType,
            },
          ],
          shortcut: [
            {
              url: buildBrandAssetUrl(favicon) ?? "/favicon.ico",
              type: favicon.mimeType,
            },
          ],
        }
      : undefined,
  };
}

function BrandLockup({
  businessName,
  assetUrl,
  className,
  imageClassName,
  fallbackClassName,
}: {
  businessName: string;
  assetUrl?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  if (assetUrl) {
    return (
      <div className={className}>
        <Image
          src={assetUrl}
          alt={`${businessName} logo`}
          width={220}
          height={72}
          className={imageClassName ?? "h-10 w-auto object-contain"}
          unoptimized
        />
      </div>
    );
  }

  return (
    <p className={fallbackClassName ?? "font-display text-2xl leading-none"}>{businessName}</p>
  );
}

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getPublicBranding();
  const businessName = branding?.name ?? "Appointment Template";
  const brandDescription =
    branding?.description ?? "Book appointments online with a reusable scheduling starter.";
  const logo = branding?.brandAssets.find((asset) => asset.kind === "LOGO");
  const alternateLogo = branding?.brandAssets.find((asset) => asset.kind === "LOGO_ALT");
  const logoUrl = buildBrandAssetUrl(logo);
  const alternateLogoUrl = buildBrandAssetUrl(alternateLogo) ?? logoUrl;

  return (
    <div
      className="public-brand-shell min-h-full"
      style={buildBrandingCssVariables(branding ?? undefined)}
    >
      <div className="min-h-full">
        <header className="border-b border-border/80 bg-surface/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-4">
              <BrandLockup
                businessName={businessName}
                assetUrl={logoUrl}
                className="shrink-0"
                fallbackClassName="font-display text-2xl leading-none"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold uppercase tracking-[0.28em] text-muted">
                  Online appointments
                </p>
                <p className="truncate text-sm text-muted">{businessName}</p>
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
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:px-8">
            <div className="grid gap-2 text-sm text-muted">
              <p>Built as a generic appointment-booking starter for time-slot-based businesses.</p>
              <p>Demo content is vertical-specific. Core booking behavior stays reusable.</p>
            </div>

            <div className="brand-accent-fill rounded-[1.75rem] px-6 py-5">
              <BrandLockup
                businessName={businessName}
                assetUrl={alternateLogoUrl}
                className="mb-3"
                imageClassName="h-9 w-auto object-contain"
                fallbackClassName="brand-on-accent font-display text-2xl leading-none"
              />
              <p className="brand-on-accent-muted text-sm leading-7">{brandDescription}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
