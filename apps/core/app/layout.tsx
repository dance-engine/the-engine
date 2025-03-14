import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

// import Head from 'next/head'
// import { ClerkProvider } from '@clerk/nextjs'
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import { MenuProvider } from '@dance-engine/ui/menu/MenuContext';  // Adjust the import path
import { MenuToggle } from '@dance-engine/ui/menu/MenuToggle'
import MobileMenu from '@dance-engine/ui/menu/MobileMenu'
import MainMenu from '@dance-engine/ui/menu/MainMenu'
// import ProfileControl from '@dance-engine/ui/ProfileControl'
import { menuContents } from './menuContents'

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dance Engine",
  description: "Replace admin hassle with dancing passion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full ">
      <body
        className={`${openSans.variable} antialiased h-full bg-base-background dark:bg-uberdark-background text-black dark:text-dark-secondary`}
      >
      <AuthKitProvider>
      <MenuProvider>
      <div>
        
        {/* Mobile Menu */}
        <MobileMenu menuContents={menuContents}/>

        {/* Normal menu */}
        <MainMenu menuContents={menuContents}/>
        
        {/* Content */}
        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200  px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            
            <MenuToggle/>
            
            <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true"></div>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <form className="grid flex-1 grid-cols-1" action="#" method="GET">
                <input type="search" name="search" aria-label="Search" className="col-start-1 row-start-1 block size-full  pl-8 text-base text-gray-900 outline-none placeholder:text-gray-400 sm:text-sm/6" placeholder="Search"/>
                <svg className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </form>
              {/* <ProfileControl/> */}
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      </MenuProvider>
      </AuthKitProvider>
      </body>
    </html>
  );
}


