import { notFound } from "next/navigation";

export function generateStaticParams() {
  return [];
}

export const metadata = {
  title: "Creator service",
  description: "Creator service profiles are being prepared.",
};

export default function CreatorDetailPage() {
  notFound();
}
