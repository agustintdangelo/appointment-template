import { AdminEmptyState, AdminPageIntro } from "@/app/admin/admin-ui";
import LanguageSettingsForm from "@/app/admin/settings/language-settings-form";
import { t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
import { getAdminBusinessSummary } from "@/lib/queries";

export default async function AdminSettingsPage() {
  const business = await getAdminBusinessSummary();
  const locale = getBusinessLocale(business?.defaultLocale);

  if (!business) {
    return (
      <AdminEmptyState
        title={t(locale, "admin.settings.emptyTitle")}
        description={t(locale, "admin.settings.emptyDescription")}
      />
    );
  }

  return (
    <>
      <AdminPageIntro
        eyebrow={t(locale, "admin.settings.eyebrow")}
        title={t(locale, "admin.settings.title")}
        description={t(locale, "admin.settings.description")}
      />

      <LanguageSettingsForm locale={locale} defaultLocale={locale} />
    </>
  );
}
