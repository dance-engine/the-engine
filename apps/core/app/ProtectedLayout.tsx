import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

// import Head from 'next/head'
import Image from "next/image";
import { ClerkProvider } from '@clerk/nextjs'
import { currentUser } from "@clerk/nextjs/server";
import { MenuProvider } from '@dance-engine/ui/menu/MenuContext';  // Adjust the import path
import { MenuToggle } from '@dance-engine/ui/menu/MenuToggle'
import MobileMenu from '@dance-engine/ui/menu/MobileMenu'
import MainMenu from '@dance-engine/ui/menu/MainMenu'
import ProfileControl from '@dance-engine/ui/ProfileControl'
import { getMenuContents } from './menuContents'

import MessengerRedirect from "./components/MessengerRedirect";
import { OrgProvider } from "@dance-engine/utils/OrgContext"
import { isSuperAdmin } from "./lib/isSuperAdmin";
import { LayoutSearchProvider } from "./components/LayoutSearchContext";
import LayoutSearchInput from "./components/LayoutSearchInput";

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
      <LayoutSearchProvider minChars={3} debounceMs={500}>
      <div>
        
        {/* Mobile Menu */}
        <MobileMenu menuContents={filteredMenuContents}/>

        {/* Normal menu */}
        <MainMenu menuContents={filteredMenuContents}/>
        
        {/* Content */}
        <div className="lg:pl-72">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 dark:bg-uberdark-background bg-white items-center gap-x-4 border-b border-gray-200 shadow-sm \
          sm:gap-x-6 \
          px-4 sm:px-6 lg:px-8">
            
            <MenuToggle/>
            
            <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true"></div>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <form className="grid flex-1 grid-cols-1" action="#" method="GET">
                <LayoutSearchInput />
                <svg className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </form>
              <ProfileControl/>
            </div>
          </header>

          <main className="py-4 sm:py-6 lg:py-10">
            <div className=" #px-4 #sm:px-6 #lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      </LayoutSearchProvider>
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


