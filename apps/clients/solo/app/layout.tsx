import { headers } from 'next/headers';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const domainConfig: Record<string, { title: string; favicon: string }> = {
  'power-of-woman': {
    title: 'Power of Woman',
    favicon: '/favicons/pow/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}




export async function generateMetadata() {
  const host = (await headers()).get('x-site-org') || '';
  const config = domainConfig[host] || {
    title: 'Powered by Dance Engine',
    favicon: '/favicons/default.ico',
  };

  return {
    title: config.title,
    icons: {
      icon: config.favicon,
    },
  };
}