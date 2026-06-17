export const roles = ["Creator", "Operator", "Both"] as const;

export type WaitlistRole = (typeof roles)[number];

export type FieldErrors = {
  name?: string;
  email?: string;
  telegram?: string;
  role?: string;
  specialty?: string;
  confirmations?: string;
};

export type WaitlistFormState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: FieldErrors;
};

export const initialWaitlistState: WaitlistFormState = {
  status: "idle",
  message: "",
};

export function validateWaitlistForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telegramInput = String(formData.get("telegram") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const specialty = String(formData.get("specialty") ?? "").trim();
  const telegram = telegramInput.startsWith("@")
    ? telegramInput
    : `@${telegramInput}`;

  const joinedTelegram = formData.get("joined_telegram") === "true";
  const followedX = formData.get("followed_x") === "true";
  const repostedAnnouncement = formData.get("reposted_announcement") === "true";
  const commentedAnnouncement =
    formData.get("commented_announcement") === "true";

  const errors: FieldErrors = {};

  if (name.length < 2) {
    errors.name = "Enter your name or operator handle.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(telegram)) {
    errors.telegram = "Enter a valid Telegram username, like @bountixoperator.";
  }

  if (!roles.includes(role as WaitlistRole)) {
    errors.role = "Choose how you want to use Bountix.";
  }

  if (specialty.length > 120) {
    errors.specialty = "Keep specialties under 120 characters.";
  }

  if (
    !joinedTelegram ||
    !followedX ||
    !repostedAnnouncement ||
    !commentedAnnouncement
  ) {
    errors.confirmations =
      "All four social confirmations are required for this legacy update form.";
  }

  return {
    data: {
      name,
      email,
      telegram_username: telegram,
      role: role as WaitlistRole,
      specialty: specialty || null,
      joined_telegram: joinedTelegram,
      followed_x: followedX,
      reposted_announcement: repostedAnnouncement,
      commented_announcement: commentedAnnouncement,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
