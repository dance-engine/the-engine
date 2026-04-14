import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type UserOrganisations = Record<string, string[]>;

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
  public_metadata?: {
    organisations?: UserOrganisations;
    title?: string;
  };
  created_at?: number;
  last_sign_in_at?: number | null;
  last_active_at?: number | null;
  banned?: boolean;
  locked?: boolean;
};

const isSuperAdmin = (organisations?: UserOrganisations) =>
  Object.prototype.hasOwnProperty.call(organisations ?? {}, "*") &&
  (!Array.isArray(organisations?.["*"]) ||
    organisations["*"].length === 0 ||
    organisations["*"].includes("*") ||
    organisations["*"].includes("superadmin"));

const fetchClerkUsers = async () => {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const users: ClerkUser[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const response = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load Clerk users (${response.status})`);
    }

    const payload = await response.json();
    const pageUsers = Array.isArray(payload)
      ? (payload as ClerkUser[])
      : Array.isArray(payload?.data)
        ? (payload.data as ClerkUser[])
        : [];

    users.push(...pageUsers);

    if (pageUsers.length < limit) {
      break;
    }

    offset += pageUsers.length;
  }

  return users;
};

export async function GET() {
  const user = await currentUser();
  const organisations = user?.publicMetadata?.organisations as
    | UserOrganisations
    | undefined;

  if (!user || !isSuperAdmin(organisations)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const users = await fetchClerkUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load users";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
