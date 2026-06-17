import { Handshake, LockKeyhole, MessageSquareText } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FutureBadge } from "@/components/marketplace/badges";
import {
  createTranslator,
  type TranslationKey,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Dashboard Deals",
};

const dealSteps = [
  {
    icon: Handshake,
    titleKey: "dashboard.deals.negotiation",
    descriptionKey: "dashboard.deals.negotiationBody",
  },
  {
    icon: LockKeyhole,
    titleKey: "dashboard.deals.escrow",
    descriptionKey: "dashboard.deals.escrowBody",
  },
  {
    icon: MessageSquareText,
    titleKey: "dashboard.deals.messages",
    descriptionKey: "dashboard.deals.messagesBody",
  },
] satisfies {
  icon: typeof Handshake;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}[];

export default async function DashboardDealsPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <DashboardShell
      title={t("dashboard.deals.title")}
      description={t("dashboard.deals.body")}
      locale={locale}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {dealSteps.map((step) => (
          <div key={step.titleKey} className="panel rounded-lg p-5">
            <step.icon aria-hidden="true" className="h-5 w-5 text-aurora-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              {t(step.titleKey)}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/56">
              {t(step.descriptionKey)}
            </p>
            <div className="mt-5">
              <FutureBadge>{t("dashboard.deals.future")}</FutureBadge>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
