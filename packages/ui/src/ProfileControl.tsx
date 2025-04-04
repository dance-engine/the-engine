'use client'
import { useState } from "react";
import {
  // ClerkProvider,
  SignInButton,
  // SignUpButton,
  SignedIn,
  // SignedOut,
  // UserButton,
  SignOutButton,
  useUser
} from '@clerk/nextjs'
// import Link from 'next/link'

const ProfileControl = () => {
  const [profileMenuOpen,setProfileMenuOpen] = useState(false)
  const { isSignedIn, user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div className="flex items-center gap-x-4 lg:gap-x-6">Loading...</div>
  }

  if (!isSignedIn) {
    // You could also add a redirect to the sign-in page here
    return <div className="flex items-center gap-x-4 lg:gap-x-6"><SignInButton ><button className="block px-3 py-1 text-gray-900 dark:text-white" role="menuitem" tabIndex={-1} id="user-menu-item-1">Sign-in</button></SignInButton></div>
  }

  return (    
    <div className="flex items-center gap-x-4 lg:gap-x-6">
      <button type="button" className="-m-2.5 p-2.5 text-gray-400 dark:text-white hover:text-gray-500">
        <span className="sr-only">View notifications</span>
        <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      </button>

      
      <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true"></div>

      
      <div className="relative">
      {/* <SignedOut>
        <SignInButton ><button className="block px-3 py-1 text-sm/6 text-gray-100 dark:text-gray-100" role="menuitem" tabIndex={-1} id="user-menu-item-1">Sign-in </button></SignInButton>
      </SignedOut> */}
      <SignedIn>
        {/* <UserButton showName={true}/> */}
        <button type="button" className="-m-1.5 flex items-center p-1.5 dark:text-white" id="user-menu-button" aria-expanded="false" aria-haspopup="true" onClick={()=>{setProfileMenuOpen(!profileMenuOpen)}}>
          <span className="sr-only">Open user menu</span>
          <img className="size-8 rounded-full bg-gray-50" src={user.imageUrl} alt=""/>
          <span className="hidden lg:flex lg:items-center">
            <span className="ml-4 text-sm/6 font-semibold" aria-hidden="true">{user.firstName}</span>
            <svg className="ml-2 size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </span>
        </button>

        <div className={`${profileMenuOpen ? "" : "hidden"} absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none`} role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabIndex={-1}>
          <a href="/user/profile/" className="block px-3 py-1 text-sm/6 text-gray-900" role="menuitem" tabIndex={-1} id="user-menu-item-0">Your Account</a>
          <SignOutButton><button className="block px-3 py-1 text-sm/6 text-gray-900" role="menuitem" tabIndex={-1} id="user-menu-item-1">Sign out</button></SignOutButton>
        </div>
        
      </SignedIn>
        
      </div>
    </div>
  )
}

export default ProfileControl


