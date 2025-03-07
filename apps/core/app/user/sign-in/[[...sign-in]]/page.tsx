import { SignIn  } from "@clerk/nextjs";
import React from "react";

const pages = [
  { name: 'Dashboard', href: '/admin', current: true },
  { name: 'Login', href: '/sign-in', current: true },
]
export default function SigninPage() {
  return (
    <div className='flex justify-center'><SignIn /></div>
        
  );
}