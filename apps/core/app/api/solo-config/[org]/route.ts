import { NextResponse } from "next/server";
import {
  getOrgSoloSettings,
  setOrgAccountUrl,
  setOrgDomains,
  setOrgRedirects,
  setOrgSanityProject,
  setOrgTheme,
} from "@dance-engine/utils/solo-edge-config-write";

type RouteContext = { params: Promise<{ org: string }> };

/**
 * Single endpoint for an organisation's slice of the solo Edge Config.
 *
 * GET   /api/solo-config/{org}                       → OrgSoloSettings
 * PATCH /api/solo-config/{org}  { area, value }      → OrgSoloSettings (after the write)
 *
 * Access control and validation live in @dance-engine/utils/solo-edge-config-write.
 */

const errorResponse = (error: unknown) => {
  const status =
    error && typeof error === "object" && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
  const message = status === 500 ? "Unexpected error" : (error as Error).message;

  if (status >= 500) console.error("solo-config error:", error);
  return NextResponse.json({ error: message }, { status });
};

const isStringRecord = (value: unknown): value is Record<string, string> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => typeof entry === "string");

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function GET(_request: Request, { params }: RouteContext) {
  const { org } = await params;
  try {
    return NextResponse.json(await getOrgSoloSettings(org));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { org } = await params;

  let body: { area?: unknown; value?: unknown; accountId?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Body must be JSON");
  }

  const { area, value } = body;

  try {
    switch (area) {
      case "domains":
        if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
          return badRequest("domains must be an array of strings");
        }
        await setOrgDomains(org, value);
        break;

      case "theme":
        if (value !== null && typeof value !== "string") {
          return badRequest("theme must be a string or null");
        }
        await setOrgTheme(org, value);
        break;

      case "redirects":
        if (!isStringRecord(value)) {
          return badRequest("redirects must be an object of path → target");
        }
        await setOrgRedirects(org, value);
        break;

      case "accountUrl":
        if (value !== null && typeof value !== "string") {
          return badRequest("accountUrl must be a string or null");
        }
        await setOrgAccountUrl(
          org,
          value,
          typeof body.accountId === "string" ? body.accountId : undefined,
        );
        break;

      case "sanityProject": {
        const project = value as { projectId?: unknown; dataset?: unknown } | null;
        if (
          project !== null &&
          (typeof project !== "object" ||
            typeof project.projectId !== "string" ||
            typeof project.dataset !== "string")
        ) {
          return badRequest("sanityProject must be { projectId, dataset } or null");
        }
        await setOrgSanityProject(
          org,
          project && { projectId: project.projectId as string, dataset: project.dataset as string },
        );
        break;
      }

      default:
        return badRequest(
          "area must be one of: domains, theme, redirects, accountUrl, sanityProject",
        );
    }

    return NextResponse.json(await getOrgSoloSettings(org));
  } catch (error) {
    return errorResponse(error);
  }
}
