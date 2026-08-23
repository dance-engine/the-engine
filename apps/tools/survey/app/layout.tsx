import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "http://localhost:3011";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Dance Community Survey",
  description: "Help build a clearer picture of the social dance community.",
  openGraph: {
    type: "website",
    title: "Dance Community Survey",
    description: "Help build a clearer picture of the social dance community.",
    images: [{
      url: "/logo-light.png",
      width: 512,
      height: 256,
      alt: "Dance Community Survey",
    }],
  },
  twitter: {
    card: "summary",
    title: "Dance Community Survey",
    description: "Help build a clearer picture of the social dance community.",
    images: ["/logo-light.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
