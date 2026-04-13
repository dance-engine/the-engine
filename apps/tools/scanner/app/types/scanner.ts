export type OrgPermissions = Record<string, string[]>;

export type ScannerEvent = {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string | null;
};

export type EventsApiEvent = {
  ksuid?: string;
  name?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string | null;
};

export type PublicOrganisation = {
  organisation?: string;
  name?: string;
};

export type TicketStatus = "used" | "unused";

export type TicketRecord = {
  name: string;
  ticketId: string;
  attendeeName: string;
  customerEmail?: string | null;
  status: TicketStatus;
  eventId: string;
  eventName: string;
  qrCode: string;
  scannedAt: string;
  jwtHeader?: Record<string, unknown>;
  jwtPayload?: Record<string, unknown>;
  /** Slug extracted from the JWT payload for the organisation this ticket belongs to. */
  jwtOrg?: string | null;
  /** True when the JWT org does not match the currently selected organisation. */
  orgMismatch?: boolean;
};

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

export type ApiErrorPayload = {
  message?: unknown;
  msg?: unknown;
  reason?: unknown;
};
