import { clerkMiddleware, auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse, NextFetchEvent } from "next/server";

const handleClerk = clerkMiddleware();

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  const maybeRes = await handleClerk(request, event);
  const response = maybeRes instanceof NextResponse ? maybeRes : NextResponse.next(); // ✅ response we can safely modify

  const { userId, sessionClaims } = await auth();

  const cookie = request.cookies.get("lastOrgSlug")?.value;
  const metadata = sessionClaims?.metadata as {
    organisations?: Record<string, unknown>;
  };

  const orgs = metadata?.organisations ?? {};
  const orgSlugs = Object.keys(orgs);

  if (userId && !cookie && orgSlugs.length === 1) {
    const defaultSlug = orgSlugs[0];
    if (defaultSlug) {
      response.cookies.set("lastOrgSlug", defaultSlug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return response;
}


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/secure'
  ],
}