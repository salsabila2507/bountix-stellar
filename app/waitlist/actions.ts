"use server";

import { createClient } from "@/utils/supabase/server";
import {
  type WaitlistFormState,
  validateWaitlistForm,
} from "@/lib/waitlist";

export async function joinWaitlist(
  _previousState: WaitlistFormState,
  formData: FormData,
): Promise<WaitlistFormState> {
  const validation = validateWaitlistForm(formData);

  if (!validation.isValid) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: validation.errors,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert(validation.data);

    if (error?.code === "23505") {
      return {
        status: "error",
        message: "That email is already registered for Bountix updates.",
      };
    }

    if (error?.code === "42P01") {
      return {
        status: "error",
        message:
          "The waitlist table is not set up yet. Create the Supabase waitlist table first.",
      };
    }

    if (error?.code === "42501") {
      return {
        status: "error",
        message:
          "Supabase is blocking public inserts. Add the waitlist insert policy first.",
      };
    }

    if (error) {
      return {
        status: "error",
        message:
          "We could not save your spot right now. Please try again shortly.",
      };
    }

    return {
      status: "success",
      message:
        "You are registered for Bountix updates. You can sign up to use the platform now.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error && error.message.includes("Supabase")
          ? "Supabase is not configured yet. Add the environment variables and retry."
          : "Something went wrong. Please try again.",
    };
  }
}
