import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

// import Head from 'next/head'
import Image from "next/image";
import { ClerkProvider } from '@clerk/nextjs'
import { currentUser } from "@clerk/nextjs/server";
import { MenuProvider } from '@dance-engine/ui/menu/MenuContext';
import { getMenuContents } from './menuContents'

import MessengerRedirect from "./components/MessengerRedirect";
import { OrgProvider } from "@dance-engine/utils/OrgContext"
import { isSuperAdmin } from "./lib/isSuperAdmin";
import ProtectedAppShell from "./components/ProtectedAppShell";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dance Engine",
  description: "Replace admin hassle with dancing passion",
};

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  const filteredMenuContents = getMenuContents(isSuperAdmin(user?.publicMetadata));

  return (
    <html lang="en" className="h-full ">
      <body
        className={`${openSans.variable} antialiased h-full bg-base-background dark:bg-uberdark-background text-black dark:text-dark-secondary`}
      >
      <MessengerRedirect />
      
      <ClerkProvider>
      <OrgProvider>
      <MenuProvider>

      {user?.publicMetadata.admin ? 
      <ProtectedAppShell menuContents={filteredMenuContents}>
        {children}
      </ProtectedAppShell>
      :
      <div className="flex flex-col items-center justify-center h-screen dark:text-dark-secondary bg-[url(/circuits.jpg)] bg-cover bg-center ">
        <Image src="/dance-engine-logo-wide.png" width={300} height={100} alt="Dance Engine" className="mb-6"/>
        <div className="text-center rounded bg-amber-50 p-8 shadow-lg max-w-lg">
          
          <h1 className="text-xl font-bold ">Your account does not currently have access</h1>
          <p>Either you&apos;re a cheeky monkey trying to access the admin panel, or your account is still being set up. If you think this is a mistake, please contact your administrator.</p>
        </div>
      </div>
    }

      </MenuProvider>
      </OrgProvider>
      </ClerkProvider>

      </body>
    </html>
  );
}
