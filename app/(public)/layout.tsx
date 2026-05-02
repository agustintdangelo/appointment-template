import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import LanguageSelector from "@/app/components/language-selector";
import LocalizedSection from "@/app/components/localized-section";
import { buildBrandAssetUrl, buildBrandingCssVariables } from "@/lib/branding";
import { t } from "@/lib/i18n";
import { getPublicLocale } from "@/lib/locale-server";
import { getPublicBranding } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBranding();
  const locale = await getPublicLocale(branding?.defaultLocale);
  const businessName = branding?.name ?? "Appointment Template";
  const favicon = branding?.brandAssets.find((asset) => asset.kind === "FAVICON");

  return {
    title: {
      default: businessName,
      template: `%s | ${businessName}`,
    },
    description:
      branding?.description ??
      t(locale, "public.metadataDescription"),
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
  altText,
  className,
  imageClassName,
  fallbackClassName,
}: {
  businessName: string;
  assetUrl?: string | null;
  altText: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  if (assetUrl) {
    return (
      <div className={className}>
        <Image
          src={assetUrl}
          alt={altText}
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
  const locale = await getPublicLocale(branding?.defaultLocale);
  const businessName = branding?.name ?? "Appointment Template";
  const brandDescription =
    branding?.description ?? t(locale, "public.defaultBrandDescription");
  const logo = branding?.brandAssets.find((asset) => asset.kind === "LOGO");
  const alternateLogo = branding?.brandAssets.find((asset) => asset.kind === "LOGO_ALT");
  const logoUrl = buildBrandAssetUrl(logo);
  const alternateLogoUrl = buildBrandAssetUrl(alternateLogo) ?? logoUrl;

  return (
    <div
      lang={locale}
      className="public-brand-shell min-h-full"
      style={buildBrandingCssVariables(branding ?? undefined)}
    >
      <div className="min-h-full">
        <LocalizedSection
          as="header"
          order={0}
          className="relative z-40 border-b border-border/80 bg-surface/90 backdrop-blur"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-4">
              <BrandLockup
                businessName={businessName}
                assetUrl={logoUrl}
                altText={t(locale, "public.logoAlt", { businessName })}
                className="shrink-0"
                fallbackClassName="font-display text-2xl leading-none"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold uppercase tracking-[0.28em] text-muted">
                  {t(locale, "common.onlineAppointments")}
                </p>
                <p className="truncate text-sm text-muted">{businessName}</p>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center justify-end gap-4 text-sm font-medium text-muted">
              <Link href="/" className="min-w-[4.75rem] text-center transition hover:text-foreground">
                {t(locale, "common.home")}
              </Link>
              <Link href="/services" className="min-w-[4.75rem] text-center transition hover:text-foreground">
                {t(locale, "common.services")}
              </Link>
              <Link href="/book" className="min-w-[4.75rem] text-center transition hover:text-foreground">
                {t(locale, "common.book")}
              </Link>
              <Link href="/admin/appointments" className="min-w-[4.75rem] text-center transition hover:text-foreground">
                {t(locale, "common.admin")}
              </Link>
              <LanguageSelector locale={locale} />
            </nav>
          </div>
        </LocalizedSection>

        <main className="flex-1">{children}</main>

        <LocalizedSection
          as="footer"
          order={5}
          className="border-t border-border/80 bg-surface/80"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:px-8">
            <div className="grid gap-2 text-sm text-muted">
              <p>{t(locale, "public.genericFooter")}</p>
              <p>{t(locale, "public.demoFooter")}</p>
            </div>

            <div className="brand-accent-fill rounded-[1.75rem] px-6 py-5">
              <BrandLockup
                businessName={businessName}
                assetUrl={alternateLogoUrl}
                altText={t(locale, "public.logoAlt", { businessName })}
                className="mb-3"
                imageClassName="h-9 w-auto object-contain"
                fallbackClassName="brand-on-accent font-display text-2xl leading-none"
              />
              <p className="brand-on-accent-muted text-sm leading-7">{brandDescription}</p>
            </div>
          </div>
        </LocalizedSection>
      </div>
    </div>
  );
}
