"use client";
import { useRouter } from "next/navigation";

export default function LoginButton() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/api/auth/login"); // Calls WorkOS login API route
  };

  return (
    <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 text-white rounded">
      Sign in with WorkOS
    </button>
  );
}
