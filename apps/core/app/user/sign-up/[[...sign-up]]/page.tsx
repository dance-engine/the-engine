import { SignUp } from "@clerk/nextjs";
import React from "react";
import Layout from "@components/layout/layout";
import { Container } from "@components/layout/container";
import Navigation from "@components/admin/navigation";

const pages = [
  { name: 'Dashboard', href: '/admin', current: true },
  { name: 'Login', href: '/sign-in', current: true },
]
export default function Page() {
  return (
    <Layout>
    <section className={`flex-1 relative transition duration-150 ease-out body-font overflow-hidden bg-none text-white`}>
      {" "}
      <Container width="large" padding="tight" className={`flex-1 pb-2`} size="top">
        <Navigation pages={pages} />
      </Container>        
      <Container width="small" padding="tight" className={`flex-1 pb-2 flex justify-center pt-12`} size="none">
        <SignUp />
      </Container>
    </section>
  </Layout>
  );
}