import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/marketplace/empty-state";
import { SubmissionForm } from "@/components/marketplace/submission-form";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Dashboard Submissions",
};

export default async function DashboardSubmissionsPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <DashboardShell
      title={t("dashboard.submissions.title")}
      description={t("dashboard.submissions.body")}
      locale={locale}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <EmptyState
          title={t("dashboard.submissions.emptyTitle")}
          description={t("dashboard.submissions.emptyBody")}
        />
        <SubmissionForm locale={locale} />
      </div>
    </DashboardShell>
  );
}
