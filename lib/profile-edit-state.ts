export type ProfileEditState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    wallet_address?: string;
    x?: string;
    telegram?: string;
    github?: string;
    website?: string;
    preferred_language?: string;
  };
};

export const initialProfileEditState: ProfileEditState = {
  status: "idle",
  message: "",
};
