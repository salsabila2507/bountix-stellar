"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { ServiceFormState } from "@/lib/service-form-state";
import {
  SERVICE_PAYMENT_METHODS,
  SERVICE_PRICE_TYPES,
  SERVICE_STATUSES,
  parseServiceTags,
  type ServicePaymentMethod,
  type ServicePriceType,
  type ServiceStatus,
} from "@/lib/services";
import { isUuid } from "@/lib/tasks";

type ParsedServiceInput = {
  title: string;
  category: string | null;
  description: string;
  tags: string[] | null;
  price_amount: number | null;
  price_type: ServicePriceType;
  delivery_time: string | null;
  payment_method: ServicePaymentMethod;
  status: ServiceStatus;
};

function parseServiceInput(formData: FormData): {
  data: ParsedServiceInput;
  fieldErrors: ServiceFormState["fieldErrors"];
} {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const priceRaw = String(formData.get("price_amount") ?? "").trim();
  const price_type = String(formData.get("price_type") ?? "fixed");
  const delivery_time = String(formData.get("delivery_time") ?? "").trim();
  const payment_method = String(formData.get("payment_method") ?? "");
  const status = String(formData.get("status") ?? "active");
  const fieldErrors: ServiceFormState["fieldErrors"] = {};

  if (title.length < 4 || title.length > 140) {
    fieldErrors.title = "Title must be 4-140 characters.";
  }
  if (description.length < 1 || description.length > 4000) {
    fieldErrors.description = "Description is required (up to 4000 chars).";
  }
  if (category.length > 60) {
    fieldErrors.category = "Category must be 60 characters or fewer.";
  }

  const rawTags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  const tags = parseServiceTags(tagsRaw);
  if (rawTags.length > 12) {
    fieldErrors.tags = "Use 12 tags or fewer.";
  }
  const longTag = tags.find((tag) => tag.length > 40);
  if (longTag) {
    fieldErrors.tags = "Each tag must be 40 characters or fewer.";
  }

  if (!(SERVICE_PRICE_TYPES as readonly string[]).includes(price_type)) {
    fieldErrors.price_type = "Invalid price type.";
  }

  let price_amount: number | null = null;
  if (priceRaw) {
    const n = Number(priceRaw);
    if (!Number.isFinite(n) || n <= 0) {
      fieldErrors.price_amount = "Price must be a positive number.";
    } else if (n > 9_999_999.99) {
      fieldErrors.price_amount = "Price is too large.";
    } else {
      price_amount = Math.round(n * 100) / 100;
    }
  }
  if (price_type === "fixed" && price_amount === null) {
    fieldErrors.price_amount = "Fixed price needs a positive amount.";
  }

  if (delivery_time.length > 80) {
    fieldErrors.delivery_time = "Delivery time must be 80 characters or fewer.";
  }
  if (
    !(SERVICE_PAYMENT_METHODS as readonly string[]).includes(payment_method)
  ) {
    fieldErrors.payment_method = "Pick a payment method.";
  }
  if (!(SERVICE_STATUSES as readonly string[]).includes(status)) {
    fieldErrors.status = "Invalid status.";
  }

  return {
    data: {
      title,
      category: category || null,
      description,
      tags: tags.length > 0 ? tags : null,
      price_amount,
      price_type: price_type as ServicePriceType,
      delivery_time: delivery_time || null,
      payment_method: payment_method as ServicePaymentMethod,
      status: status as ServiceStatus,
    },
    fieldErrors,
  };
}

async function loadActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: profile as
      | {
          id: string;
          username: string;
          role: string;
        }
      | null,
  };
}

function revalidateServicePaths(username?: string | null) {
  revalidatePath("/creators");
  revalidatePath("/dashboard/services");
  if (username) revalidatePath(`/profile/${username}`);
}

export async function createServiceAction(
  _previous: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");
  if (!profile) {
    return {
      status: "error",
      message: "Your profile is missing. Refresh and try again.",
    };
  }

  const { data, fieldErrors } = parseServiceInput(formData);
  if (Object.keys(fieldErrors ?? {}).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("services").insert({
    creator_id: user.id,
    title: data.title,
    category: data.category,
    description: data.description,
    tags: data.tags,
    price_amount: data.price_amount,
    currency: "USDC",
    price_type: data.price_type,
    delivery_time: data.delivery_time,
    payment_method: data.payment_method,
    status: "active",
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Could not create service offer right now.",
    };
  }

  revalidateServicePaths(profile.username);
  redirect("/dashboard/services");
}

export async function updateServiceAction(
  serviceId: string,
  _previous: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  if (!isUuid(serviceId)) {
    return { status: "error", message: "Invalid service id." };
  }

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");
  if (!profile) {
    return {
      status: "error",
      message: "Your profile is missing. Refresh and try again.",
    };
  }

  const { data, fieldErrors } = parseServiceInput(formData);
  if (Object.keys(fieldErrors ?? {}).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("services")
    .update({
      title: data.title,
      category: data.category,
      description: data.description,
      tags: data.tags,
      price_amount: data.price_amount,
      currency: "USDC",
      price_type: data.price_type,
      delivery_time: data.delivery_time,
      payment_method: data.payment_method,
      status: data.status,
    })
    .eq("id", serviceId);

  if (error) {
    return {
      status: "error",
      message: error.message || "Could not save service offer right now.",
    };
  }

  revalidateServicePaths(profile.username);
  return { status: "success", message: "Service offer updated.", serviceId };
}

export async function setServiceStatusAction(
  serviceId: string,
  status: ServiceStatus,
): Promise<void> {
  if (!isUuid(serviceId)) return;
  if (!(SERVICE_STATUSES as readonly string[]).includes(status)) return;

  const { supabase, user, profile } = await loadActor();
  if (!user) redirect("/login");

  await supabase.from("services").update({ status }).eq("id", serviceId);
  revalidateServicePaths(profile?.username);
}

// This is a "use server" file. Types/constants live in lib/services.ts.
