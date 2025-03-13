import { SignIn  } from "@clerk/nextjs";
import React from "react";

export default function SigninPage() {
  return (
    <div className='flex justify-center'><SignIn /></div>
  );
}