import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SiteFooter } from "@/components/site-footer";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bountix.xyz"),
  title: {
    default: "Bountix | Task Marketplace for Community Work",
    template: "%s | Bountix",
  },
  description:
    "Bountix is a task marketplace for posting work, reviewing submissions, and paying rewards on Stellar through manual payment or escrow.",
  keywords: [
    "Bountix",
    "global task marketplace",
    "task rewards",
    "Stellar",
    "online tasks",
    "local help",
    "creator marketplace",
  ],
  icons: {
    icon: "/bountix-comic/bountix_assets_ready/bountix-app-icon.png",
    apple: "/bountix-comic/bountix_assets_ready/bountix-app-icon.png",
  },
  openGraph: {
    title: "Bountix | Task Marketplace for Community Work",
    description:
      "Post tasks, review submissions, and pay approved work with manual payment or Stellar escrow.",
    url: "https://www.bountix.xyz",
    siteName: "Bountix",
    type: "website",
    images: ["/bountix-comic/hero-logo-latest.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bountix | Task Marketplace for Community Work",
    description:
      "A task marketplace for posting work, submitting results, chatting, and managing rewards on Stellar.",
    images: ["/bountix-comic/hero-logo-latest.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
          <SiteFooter />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
