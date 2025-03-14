import Link from 'next/link';
import {
  getSignInUrl,
  getSignUpUrl,
  withAuth,
  signOut,
} from '@workos-inc/authkit-nextjs';

export default async function HomePage() {
  // Retrieves the user from the session or returns `null` if no user is signed in
  const { user } = await withAuth();

  // Get the URL to redirect the user to AuthKit to sign in
  const signInUrl = await getSignInUrl();

  // Get the URL to redirect the user to AuthKit to sign up
  const signUpUrl = await getSignUpUrl();

  if (!user) {
    return (
      <>
        <Link href={signInUrl}>Sign in</Link>
        <Link href={signUpUrl}>Sign up</Link>
      </>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <p>Welcome back{user.firstName && `, ${user.firstName}`}</p>
      <button type="submit">Sign out</button>
    </form>
  );
}
