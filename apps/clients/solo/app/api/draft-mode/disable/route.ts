import { cookies, draftMode } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const draftModeStore = await draftMode();
  draftModeStore.disable();

  const cookieStore = await cookies();
  cookieStore.delete("sanity-preview-perspective");

  return NextResponse.redirect(new URL("/", request.url));
}
