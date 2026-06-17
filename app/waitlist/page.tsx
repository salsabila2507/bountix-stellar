import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign Up",
  description:
    "Sign up for Bountix to create, apply, submit, chat, and earn through tasks.",
};

export default function WaitlistPage() {
  redirect("/signup");
}
