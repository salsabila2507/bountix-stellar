"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPublicSiteUrl, normalizeReferralCode } from "@/lib/referrals";
import { createClient } from "@/utils/supabase/server";
import type { AuthFormState } from "@/lib/auth-form";

function validateCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fieldErrors: AuthFormState["fieldErrors"] = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  return {
    email,
    password,
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

function validatePassword(password: string) {
  const fieldErrors: AuthFormState["fieldErrors"] = {};

  if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  return {
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export async function signupAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, fieldErrors, isValid } =
    validateCredentials(formData);
  if (!isValid) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const referralCode = normalizeReferralCode(formData.get("referral_code"));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: referralCode
        ? {
            data: {
              referral_code: referralCode,
            },
          }
        : undefined,
    });
    if (error) {
      // Common: "User already registered" → 422
      const friendly = /already registered|exists/i.test(error.message)
        ? "That email is already registered. Try logging in instead or use the forgot password link."
        : error.message;
      return { status: "error", message: friendly };
    }

    if (referralCode) {
      try {
        await supabase.rpc("record_referral_by_code", {
          referral_code_input: referralCode,
        });
      } catch {
        // The auth trigger also records password-signup referrals.
      }
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not create account right now.",
    };
  }

  redirect("/dashboard/profile");
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, fieldErrors, isValid } =
    validateCredentials(formData);
  if (!isValid) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return {
        status: "error",
        message: "Invalid email or password. Check your details or use the forgot password link.",
      };
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not log you in right now.",
    };
  }

  redirect("/dashboard/profile");
}

export async function forgotPasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      status: "error",
      message: "Enter a valid email address.",
      fieldErrors: { email: "Enter a valid email address." },
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getPublicSiteUrl()}/auth/reset-password`,
    });

    if (error) {
      return {
        status: "error",
        message: "Could not send reset email. Please try again.",
      };
    }

    return {
      status: "success",
      message: "Check your email for a password reset link. It expires in 1 hour.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not send reset email right now.",
    };
  }
}

export async function resetPasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const { fieldErrors, isValid } = validatePassword(password);

  if (!isValid) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords do not match.",
      fieldErrors: { password: "Passwords do not match." },
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return {
        status: "error",
        message: "Could not reset password. The link may have expired.",
      };
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not reset password right now.",
    };
  }

  redirect("/login?message=Password reset successfully. Please log in.");
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("session", "", { maxAge: 0, path: "/" });
    cookieStore.set("privy-token", "", { maxAge: 0, path: "/" });
  } catch {
    // Cookie clear best-effort
  }
  redirect("/");
}
