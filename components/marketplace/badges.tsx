import {
  BadgeCheck,
  CircleDollarSign,
  Handshake,
  Hourglass,
  LockKeyhole,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";
import type { PaymentType, TaskType, WorkStatus } from "@/lib/marketplace";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-lg border-2 border-[#140625] px-2.5 py-1 text-xs font-black text-[#140625] shadow-[3px_3px_0_#140625]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TaskTypeBadge({
  type,
  locale = DEFAULT_LOCALE,
}: {
  type: TaskType;
  locale?: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <Badge className="bg-[#38e7ff]">
      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
      {type === "service"
        ? t("market.taskType.service")
        : t("market.taskType.task")}
    </Badge>
  );
}

export function PaymentBadge({
  type,
  locale = DEFAULT_LOCALE,
}: {
  type: PaymentType;
  locale?: Locale;
}) {
  const t = createTranslator(locale);

  if (type === "escrow") {
    return (
      <Badge className="bg-[#f1d8ff]">
        <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-[#7c3cff]" />
        {t("payment.escrow")}
      </Badge>
    );
  }

  return (
    <Badge className="bg-white">
      <CircleDollarSign
        aria-hidden="true"
        className="h-3.5 w-3.5 text-[#23b26d]"
      />
      {t("payment.manualTitle")}
    </Badge>
  );
}

export function StatusBadge({
  status,
  locale = DEFAULT_LOCALE,
}: {
  status: WorkStatus;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const labelKey: Record<WorkStatus, TranslationKey> = {
    open: "market.status.open",
    reviewing: "market.status.reviewing",
    in_progress: "market.status.in_progress",
    submitted: "market.status.submitted",
    completed: "market.status.completed",
  };

  return (
    <Badge className="bg-[#ffdd3d]">
      <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#7c3cff]" />
      {t(labelKey[status])}
    </Badge>
  );
}

export function NegotiableBadge({
  negotiable,
  locale = DEFAULT_LOCALE,
}: {
  negotiable: boolean;
  locale?: Locale;
}) {
  const t = createTranslator(locale);

  if (!negotiable) {
    return null;
  }

  return (
    <Badge className="bg-[#ff4fb8] text-white">
      <Handshake aria-hidden="true" className="h-3.5 w-3.5" />
      {t("market.badge.negotiable")}
    </Badge>
  );
}

export function FutureBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="bg-[#fff8ed] text-[#5a3b66]">
      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </Badge>
  );
}

export function EarlyContributorsOnlyBadge({
  locale = DEFAULT_LOCALE,
}: {
  locale?: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <Badge className="bg-[#f1d8ff]">
      <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-[#7c3cff]" />
      {t("early.contributorsOnly")}
    </Badge>
  );
}

export function AccessBadge({
  variant = "preview",
  locale = DEFAULT_LOCALE,
}: {
  variant?: "preview" | "early";
  locale?: Locale;
}) {
  const t = createTranslator(locale);

  if (variant === "preview") {
    return (
      <Badge className="bg-[#38e7ff]">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[#7c3cff]" />
        {t("common.preview")}
      </Badge>
    );
  }

  if (variant === "early") {
    return (
      <Badge className="bg-[#f1d8ff]">
        <Hourglass aria-hidden="true" className="h-3.5 w-3.5 text-[#7c3cff]" />
        {t("early.access")}
      </Badge>
    );
  }

  return null;
}
