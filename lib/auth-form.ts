export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};

export const initialAuthState: AuthFormState = { status: "idle", message: "" };
