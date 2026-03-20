import { NextResponse } from "next/server";
import { resetTicketUnused } from "../_lib/data";
import { parseScannerBody } from "../_lib/http";

export async function POST(request: Request) {
  const parsed = await parseScannerBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { orgId, eventId, qrCode } = parsed.value;
  const ticket = resetTicketUnused(orgId, eventId, qrCode);

  if (!ticket) {
    return NextResponse.json(
      { msg: "Ticket or event not found for this organisation." },
      { status: 404 },
    );
  }

  return NextResponse.json({ msg: "Ticket reset to unused", ticket }, { status: 200 });
}
