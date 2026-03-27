import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dance Engine Scanner",
  description: "Ticket scanner for Dance Engine events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-base-background text-black">
        {publishableKey ? (
          <ClerkProvider
            publishableKey={publishableKey}
            appearance={{
              variables: {
                colorBackground: "#01164d",
                colorTextOnPrimaryBackground: "white",
                colorPrimary: "#FC27A7",
                colorText: "white",
                colorTextSecondary: "#c0c8e8",
                colorInputText: "white",
                colorInputBackground: "#0a2166",
              },
              elements: {
                socialButtonsBlockButton: {
                  backgroundColor: "#0a2166",
                  color: "white",
                  borderColor: "#2a4080",
                },
                socialButtonsBlockButtonText: {
                  color: "white",
                },
              },
            }}
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
