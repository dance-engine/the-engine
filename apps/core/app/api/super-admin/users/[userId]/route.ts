import { clerkClient, currentUser } from "@clerk/nextjs/server";
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
    admin?: boolean;
    organisations?: UserOrganisations;
    title?: string;
    lastOrg?: string | null;
  };
  created_at?: number;
  last_sign_in_at?: number | null;
  last_active_at?: number | null;
  banned?: boolean;
  locked?: boolean;
};

type RawClerkUser = ClerkUser & {
  publicMetadata?: ClerkUser["public_metadata"];
};

type UserPermissions = "superadmin" | "scanning";

type SetPermissionsAction = {
  action: "set-permissions";
  admin: boolean;
  organisations: Record<string, string[]>;
};

type UserActionRequest = SetPermissionsAction;

const isSuperAdmin = (organisations?: UserOrganisations) =>
  Object.prototype.hasOwnProperty.call(organisations ?? {}, "*") &&
  (!Array.isArray(organisations?.["*"]) ||
    organisations["*"].length === 0 ||
    organisations["*"].includes("superadmin") ||
    organisations["*"].includes("*"));

const sanitiseUser = (user: RawClerkUser) => ({
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  full_name: user.full_name,
  username: user.username,
  image_url: user.image_url,
  profile_image_url: user.profile_image_url,
  primary_email_address_id: user.primary_email_address_id,
  email_addresses: user.email_addresses,
  public_metadata: user.public_metadata ?? user.publicMetadata,
  created_at: user.created_at,
  last_sign_in_at: user.last_sign_in_at,
  last_active_at: user.last_active_at,
  banned: user.banned,
  locked: user.locked,
});

const allowedPermissions: UserPermissions[] = ["superadmin", "scanning"];

const getValidatedOrganisations = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("organisations must be an object");
  }

  const entries = Object.entries(value as Record<string, unknown>);

  return entries.reduce<UserOrganisations>((acc, [slug, permissions]) => {
    const cleanedSlug = slug.trim();

    if (!cleanedSlug) {
      return acc;
    }

    if (!Array.isArray(permissions)) {
      throw new Error(`Permissions for ${cleanedSlug} must be an array`);
    }

    const cleanedPermissions = Array.from(
      new Set(
        permissions.filter(
          (permission): permission is UserPermissions =>
            typeof permission === "string" &&
            allowedPermissions.includes(permission as UserPermissions),
        ),
      ),
    );

    if (cleanedPermissions.length > 0) {
      acc[cleanedSlug] = cleanedPermissions;
    }

    return acc;
  }, {});
};

export async function POST(
  req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const actingUser = await currentUser();
  const actingOrganisations = actingUser?.publicMetadata?.organisations as
    | UserOrganisations
    | undefined;

  if (!actingUser || !isSuperAdmin(actingOrganisations)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId } = await context.params;

  try {
    const payload = (await req.json()) as UserActionRequest;
    const clerk = await clerkClient();
    const targetUser = (await clerk.users.getUser(userId)) as RawClerkUser;
    const currentMetadata = (targetUser.publicMetadata ??
      targetUser.public_metadata ??
      {}) as ClerkUser["public_metadata"];

    switch (payload.action) {
      case "set-permissions": {
        const nextOrganisations = getValidatedOrganisations(
          payload.organisations,
        );

        const nextLastOrg =
          currentMetadata?.lastOrg &&
          (Object.prototype.hasOwnProperty.call(
            nextOrganisations,
            currentMetadata.lastOrg,
          ) ||
            Object.prototype.hasOwnProperty.call(nextOrganisations, "*"))
            ? currentMetadata.lastOrg
            : null;

        const updatedUser = (await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...currentMetadata,
            admin: payload.admin,
            organisations: nextOrganisations,
            lastOrg: nextLastOrg,
          },
        })) as RawClerkUser;

        return NextResponse.json({ user: sanitiseUser(updatedUser) });
      }
      default:
        return NextResponse.json(
          { error: "Unsupported action" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
