export type ScannerEvent = {
  id: string;
  name: string;
  startsAt: string;
};

export type TicketStatus = "used" | "unused";

export type TicketRecord = {
  ticketId: string;
  attendeeName: string;
  status: TicketStatus;
  eventId: string;
  eventName: string;
  qrCode: string;
  scannedAt: string;
};

type TicketSeed = {
  ticketId: string;
  attendeeName: string;
  status: TicketStatus;
  eventId: string;
  eventName: string;
  qrCode: string;
};

const eventsByOrg: Record<string, ScannerEvent[]> = {
  "*": [
    { id: "ev-global-1", name: "Global Test Night", startsAt: "2026-04-01T18:00:00.000Z" },
  ],
  "dance-engine": [
    { id: "ev-de-1", name: "Friday Showcase", startsAt: "2026-03-28T19:30:00.000Z" },
    { id: "ev-de-2", name: "Sunday Social", startsAt: "2026-03-30T16:00:00.000Z" },
  ],
  solo: [
    { id: "ev-solo-1", name: "Beginner Bootcamp", startsAt: "2026-04-05T10:00:00.000Z" },
  ],
};

const tickets = new Map<string, TicketSeed>();

const toTicketKey = (orgId: string, eventId: string, qrCode: string): string =>
  `${orgId}:${eventId}:${qrCode}`;

const findEvent = (orgId: string, eventId: string): ScannerEvent | null => {
  const direct = eventsByOrg[orgId] ?? [];
  const event = direct.find((item) => item.id === eventId);
  if (event) {
    return event;
  }
  const global = eventsByOrg["*"] ?? [];
  return global.find((item) => item.id === eventId) ?? null;
};

const fallbackAttendeeName = (qrCode: string): string => {
  const suffix = qrCode.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "0000";
  return `Guest ${suffix}`;
};

const ensureSeed = (orgId: string, eventId: string, qrCode: string): TicketSeed | null => {
  const key = toTicketKey(orgId, eventId, qrCode);
  const existing = tickets.get(key);
  if (existing) {
    return existing;
  }

  const event = findEvent(orgId, eventId);
  if (!event) {
    return null;
  }

  const next: TicketSeed = {
    ticketId: `TK-${qrCode.toUpperCase()}`,
    attendeeName: fallbackAttendeeName(qrCode),
    status: "unused",
    eventId,
    eventName: event.name,
    qrCode,
  };
  tickets.set(key, next);
  return next;
};

const withScanTimestamp = (seed: TicketSeed): TicketRecord => ({
  ...seed,
  scannedAt: new Date().toISOString(),
});

export const getEventsForOrg = (orgId: string): ScannerEvent[] => {
  if (orgId === "*") {
    return Object.values(eventsByOrg)
      .flat()
      .reduce<ScannerEvent[]>((acc, event) => {
        if (!acc.some((item) => item.id === event.id)) {
          acc.push(event);
        }
        return acc;
      }, []);
  }
  return eventsByOrg[orgId] ?? [];
};

export const checkTicket = (orgId: string, eventId: string, qrCode: string): TicketRecord | null => {
  const seed = ensureSeed(orgId, eventId, qrCode);
  if (!seed) {
    return null;
  }
  return withScanTimestamp(seed);
};

export const markTicketUsed = (orgId: string, eventId: string, qrCode: string): TicketRecord | null => {
  const key = toTicketKey(orgId, eventId, qrCode);
  const seed = ensureSeed(orgId, eventId, qrCode);
  if (!seed) {
    return null;
  }
  const updated: TicketSeed = { ...seed, status: "used" };
  tickets.set(key, updated);
  return withScanTimestamp(updated);
};

export const resetTicketUnused = (orgId: string, eventId: string, qrCode: string): TicketRecord | null => {
  const key = toTicketKey(orgId, eventId, qrCode);
  const seed = ensureSeed(orgId, eventId, qrCode);
  if (!seed) {
    return null;
  }
  const updated: TicketSeed = { ...seed, status: "unused" };
  tickets.set(key, updated);
  return withScanTimestamp(updated);
};
