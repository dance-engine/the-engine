import { NextResponse } from "next/server";

export type ScannerBody = {
  orgId: string;
  eventId: string;
  qrCode: string;
};

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const parseScannerBody = async (
  request: Request,
): Promise<{ ok: true; value: ScannerBody } | { ok: false; response: NextResponse }> => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ msg: "Body must be valid JSON." }, { status: 400 }),
    };
  }

  const orgId = (payload as { orgId?: unknown }).orgId;
  const eventId = (payload as { eventId?: unknown }).eventId;
  const qrCode = (payload as { qrCode?: unknown }).qrCode;

  if (!hasText(orgId) || !hasText(eventId) || !hasText(qrCode)) {
    return {
      ok: false,
      response: NextResponse.json(
        { msg: "orgId, eventId and qrCode are required." },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    value: {
      orgId: orgId.trim(),
      eventId: eventId.trim(),
      qrCode: qrCode.trim(),
    },
  };
};
