import type { Metadata } from "next";
import { Cinzel_Decorative, IM_Fell_English } from "next/font/google";
import "./globals.css";
import { getReveal } from "@/lib/reveal";

const display = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--f-display",
});
const body = IM_Fell_English({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--f-body",
});

// Absolute URL is required for the preview image. Set NEXT_PUBLIC_SITE_URL to your live domain
// (e.g. https://our-reveal.vercel.app). On Vercel it falls back to the production URL automatically.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const dynamic = "force-dynamic"; // so the link preview switches on 25 Oct without a redeploy of code

export function generateMetadata(): Metadata {
  const reveal = getReveal();
  const title = reveal
    ? `It's a ${reveal === "boy" ? "Boy" : "Girl"}!`
    : "You're Invited! Baby Gender Reveal";
  const description = reveal
    ? "Thank you for celebrating our baby gender reveal with us."
    : "Sunday, 25 October 2026, 12 PM to 3 PM. Open the envelope for the details.";
  const image = `/og-${reveal ?? "invite"}.jpg`;
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Baby Gender Reveal",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} bg-black font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
