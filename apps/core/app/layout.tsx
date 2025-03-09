import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "@dance-engine/ui/styles.css";
import "./globals.css";

// import Head from 'next/head'
import Image from "next/image";
import MobileMenu from '@dance-engine/ui/MobileMenu'
import { ClerkProvider } from '@clerk/nextjs'
import { MenuProvider } from '@dance-engine/ui/MenuContext';  // Adjust the import path
import { MenuToggle } from '@dance-engine/ui/MenuToggle'
import ProfileControl from '@dance-engine/ui/ProfileControl'

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
    <html lang="en" className="h-full bg-white">
      <body
        className={`${openSans.variable} antialiased h-full`}
      >
      <ClerkProvider>
      <MenuProvider>
      <div>
        
        {/* Mobile Menu */}
        <MobileMenu/>

        {/* Normal menu */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-row">
          
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-dark-background px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Image className="h-5 w-auto" width={1354} height={128} src="/dance-engine-logo-wide.png" alt="Dance Engine - Home"/>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    <li>
                      
                      <a href="#" className="group flex gap-x-3 rounded-md bg-dark-highlight p-2 text-sm/6 font-semibold text-white">
                        <svg className="size-6 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                        Dashboard 2
                      </a>
                    </li>
                    <li>
                      <a href="/events/form" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <svg className="size-6 shrink-0 text-primary-text group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                        Events
                      </a>
                    </li>
                    <li>
                      <a href="#" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <svg className="size-6 shrink-0 text-primary-text group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                        Projects
                      </a>
                    </li>
                    <li>
                      <a href="#" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <svg className="size-6 shrink-0 text-primary-text group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        Calendar
                      </a>
                    </li>
                    <li>
                      <a href="#" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <svg className="size-6 shrink-0 text-primary-text group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                        </svg>
                        Documents
                      </a>
                    </li>
                    <li>
                      <a href="#" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <svg className="size-6 shrink-0 text-primary-text group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                        </svg>
                        Reports
                      </a>
                    </li>
                  </ul>
                </li>
                <li>
                  <div className="text-xs/6 font-semibold text-primary-text">Your teams</div>
                  <ul role="list" className="-mx-2 mt-2 space-y-1">
                    <li>
                      
                      <a href="#" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-dark-outline bg-dark-highlight text-[0.625rem] font-medium text-white">H</span>
                        <span className="truncate">Heroicons</span>
                      </a>
                    </li>
                    <li>
                      <a href="#" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-dark-outline bg-dark-highlight text-[0.625rem] font-medium text-white">T</span>
                        <span className="truncate">Tailwind Labs</span>
                      </a>
                    </li>
                    <li>
                      <a href="#" className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-dark-outline bg-dark-highlight text-[0.625rem] font-medium text-white">W</span>
                        <span className="truncate">Workcation</span>
                      </a>
                    </li>
                  </ul>
                </li>
                <li className="mt-auto">
                  <a href="#" className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                    <svg className="size-6 shrink-0 text-primary-text group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Settings
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
 

        {/* Content */}
        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            
            <MenuToggle/>
            
            <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true"></div>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <form className="grid flex-1 grid-cols-1" action="#" method="GET">
                <input type="search" name="search" aria-label="Search" className="col-start-1 row-start-1 block size-full bg-white pl-8 text-base text-gray-900 outline-none placeholder:text-gray-400 sm:text-sm/6" placeholder="Search"/>
                <svg className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </form>
              <ProfileControl/>
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
      </ClerkProvider>
      </body>
    </html>
  );
}


