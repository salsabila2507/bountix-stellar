export type ApplyState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialApplyState: ApplyState = { status: "idle", message: "" };

export type SubmitState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: { delivery_url?: string; notes?: string };
};

export const initialSubmitState: SubmitState = {
  status: "idle",
  message: "",
};
