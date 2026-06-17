export type ServiceFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    title?: string;
    description?: string;
    category?: string;
    tags?: string;
    price_amount?: string;
    price_type?: string;
    delivery_time?: string;
    payment_method?: string;
    status?: string;
  };
  serviceId?: string;
};

export const initialServiceFormState: ServiceFormState = {
  status: "idle",
  message: "",
};
