import { headers } from 'next/headers';
import { Geist, Geist_Mono, Luckiest_Guy, Oswald, Yesteryear, Caveat_Brush, Reenie_Beanie, Shadows_Into_Light_Two} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

const luckiestGuy = Luckiest_Guy({
  variable: "--font-luckiest-guy",
  weight: "400",
  subsets: ["latin"],
});

const yesteryear = Yesteryear({
  variable: "--font-yesteryear",
  weight: "400",
  subsets: ["latin"],
});

const caveatBrush = Caveat_Brush({
  variable: "--font-caveat-brush",
  weight: "400",
  subsets: ["latin"],
});

const reenieBeanie = Reenie_Beanie({
  variable: "--font-reenie-beanie",
  weight: "400",
  subsets: ["latin"],
});

const shadowsIntoLightTwo = Shadows_Into_Light_Two({
  variable: "--font-shadows-into-light-two",
  weight: "400",
  subsets: ["latin"],
});

const domainConfig: Record<string, { title: string; favicon: string }> = {
  'power-of-woman': {
    title: 'Power of Woman',
    favicon: '/favicons/pow/favicon.ico',
  },
  'rebel-sbk': {
    title: 'Rebel SBK',
    favicon: '/favicons/rebel-sbk/favicon.ico',
  },
  'latin-soul': {
    title: 'Latin Soul',
    favicon: '/favicons/latin-soul/favicon.ico',
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${yesteryear.variable} ${shadowsIntoLightTwo.variable} ${reenieBeanie.variable} ${caveatBrush.variable} ${oswald.variable} ${luckiestGuy.variable} antialiased min-h-full`}
      >
        {children}
      </body>
    </html>
  )
}




export async function generateMetadata() {
  const host = (await headers()).get('x-site-org') || '';
  const config = domainConfig[host] || {
    title: "Powered by Dance Engine",
    favicon: '/favicons/default.ico',
  };

  return {
    title: `${config.title}${process.env.NODE_ENV=='development' ? " - DEV" : ""}`,
    icons: {
      icon: config.favicon,
    },
  };
}