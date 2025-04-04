import { auth } from "@clerk/nextjs/server";
import ProtectedLayout from "./ProtectedLayout";
import PublicLayout from "./PublicLayout";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return userId ? (
    <ProtectedLayout>{children}</ProtectedLayout>
  ) : (
    <PublicLayout>{children}</PublicLayout>
  );
}