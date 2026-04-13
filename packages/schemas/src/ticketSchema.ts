'use client'
import { z } from "zod";

// Define the ticket schema
export const ticketSchema = z.object({
  entity_type: z.literal("TICKET").describe("Entity type").optional(),
  ksuid: z.string().describe("Unique identifier for the ticket").optional(),
  name: z.string().min(2, "Name must be at least 2 characters").describe("Name of the ticket").optional(),
  name_on_ticket: z.string().describe("Name to be printed on the ticket").optional(),
  customer_email: z.string().email("Invalid email address").describe("Email of the customer who owns the ticket").optional(),
  includes: z.string().array().describe("List of items included with the ticket").optional(),
  expanded_includes: z.array(z.record(z.any())).describe("List of the items included with the ticket").optional(),
  ticket_status: z.enum(["active", "void", "used"]).default("active").describe("Status of the ticket").optional(),
  financial_status: z.enum(["paid", "unpaid", "partially_refunded", "refunded", "comp"]).default("paid").describe("Financial status of the ticket").optional(),
  admission_status: z.enum(["checked_in", "not_checked_in", "denied"]).default("not_checked_in").describe("Admission status of the ticket").optional(),
  qr_token: z.string().describe("QR token for the ticket").optional(),
  checked_in_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).optional().describe("Timestamp when the ticket was checked in"),
  checked_in_by: z.string().describe("Identifier of the user who checked in the ticket").optional(),
  check_in_count: z.coerce.number().optional().describe("Number of times the ticket has been checked in"),
  version: z.coerce.number().optional().describe("Version Number"),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  created_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).optional().describe("Timestamp when the ticket was created"),
  updated_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).optional().describe("Timestamp when the ticket was last updated"),
});

// Generate TypeScript type from the schema
export type TicketType = z.infer<typeof ticketSchema>;
export type TicketTypeExtended = TicketType & {
  ksuid: string, 
  event_slug?: string, 
  parent_event_ksuid: string,
  entity_type: string,
  ticket_status: string,
  version?: number,
  meta?: Record<string, string | number | boolean>,
};

// Additional no validation metadata relating to how we display data in forms
export const ticketMetadata = {
  entity_type: { hidden: true },
  ksuid: { hidden: true },
  ticket_status: { selectField: true },
  financial_status: { selectField: true },
  admission_status: { selectField: true },
  qr_token: { hidden: true },
  checked_in_at: { info: true },
  checked_in_by: { info: true },
  check_in_count: { info: true },
  version: { info: true },
  meta: { hidden:  true },
  created_at: { info: true },
  updated_at: { info: true },
}
