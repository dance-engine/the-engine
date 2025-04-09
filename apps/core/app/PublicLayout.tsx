import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import {shadesOfPurple } from '@clerk/themes'
import MessengerRedirect from "./components/MessengerRedirect";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dance Engine",
  description: "Replace admin hassle with dancing passion",
};

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  
  <html lang="en" className="h-full">
    <body
      className={`${openSans.variable} antialiased h-full bg-uberdark-background dark:bg-uberdark-background  text-black dark:text-dark-secondary bg-[url(/circuits.jpg)]`}
    >
      <MessengerRedirect />
      
      <ClerkProvider appearance={{
        baseTheme: [shadesOfPurple],
        variables: {
          colorBackground: '#01164d',
          colorTextOnPrimaryBackground: 'white',
          colorPrimary: '#FC27A7',

        }
      }}>
        {children}
      </ClerkProvider>
    </body>
  </html>
  )
}