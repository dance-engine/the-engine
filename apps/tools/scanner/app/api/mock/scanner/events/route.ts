import { NextRequest, NextResponse } from "next/server";
import { getEventsForOrg } from "../_lib/data";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("orgId")?.trim();

  if (!orgId) {
    return NextResponse.json({ msg: "Query param orgId is required." }, { status: 400 });
  }

  const events = getEventsForOrg(orgId);
  return NextResponse.json({ msg: "Events loaded", events }, { status: 200 });
}
