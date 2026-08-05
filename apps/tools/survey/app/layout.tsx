import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dance Community Survey",
  description: "Help build a clearer picture of the social dance community.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
