import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "../lib/isSuperAdmin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/user/sign-in");
  }

  const user = await currentUser();

  if (!isSuperAdmin(user?.publicMetadata)) {
    redirect("/");
  }

  return children;
}
