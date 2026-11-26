/**
 * Server-only write helpers for the `solo` Edge Config key.
 *
 * Reads use the @vercel/edge-config SDK with the read-only EDGE_CONFIG token.
 * Writes go through the Vercel REST API, so the account-level VERCEL_API_TOKEN is
 * only ever used for the final PATCH — never for reads.
 *
 * Every public helper:
 *   1. resolves the signed-in Clerk user itself (callers cannot pass in a spoofed actor),
 *   2. checks the user belongs to the target org (or is a super admin),
 *   3. reads the latest value with `consistentRead` (bypasses the edge caches),
 *   4. changes ONLY that org's slice, validates the whole object, then upserts it.
 *
 * Required env (server only — never NEXT_PUBLIC_):
 *   EDGE_CONFIG        connection string (read-only token) — reads
 *   VERCEL_API_TOKEN   Vercel access token with access to the Edge Config store — writes only
 *   EDGE_CONFIG_ID     optional ecfg_... id (falls back to parsing EDGE_CONFIG)
 *   VERCEL_TEAM_ID     optional, required if the store belongs to a team
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { get } from "@vercel/edge-config";
import { Ajv, type ErrorObject } from "ajv";
import addFormatsModule from "ajv-formats";
import { z } from "zod";
import soloEdgeConfigJsonSchema from "@dance-engine/schemas/solo-edge-config.schema.json";
import type { SoloEdgeConfig } from "./solo-edge-config.js";
import { canOrgUseTheme, getThemesForOrg, soloThemeList } from "./solo-themes.js";

const SOLO_KEY = "solo";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class EdgeConfigAccessError extends Error {
  status = 403 as const;
  constructor(message = "You do not have access to this organisation") {
    super(message);
    this.name = "EdgeConfigAccessError";
  }
}

export class EdgeConfigValidationError extends Error {
  status = 400 as const;
  constructor(message: string) {
    super(message);
    this.name = "EdgeConfigValidationError";
  }
}

export class EdgeConfigWriteError extends Error {
  status = 502 as const;
  constructor(message: string) {
    super(message);
    this.name = "EdgeConfigWriteError";
  }
}

// ---------------------------------------------------------------------------
// Validation
//
// The whole document is checked against the same JSON Schema configured on the
// Edge Config store in Vercel (packages/schemas/json/solo-edge-config.schema.json),
// so a write we send can never be one Vercel would reject. The field checks below
// are stricter, friendlier pre-checks used by the individual helpers.
// ---------------------------------------------------------------------------

// ajv-formats is CommonJS; depending on the bundler the function is the default or .default.
const addFormats = ((addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ??
  addFormatsModule) as typeof addFormatsModule;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateSoloDocument = ajv.compile<{ solo: SoloEdgeConfig }>(soloEdgeConfigJsonSchema);

const formatAjvErrors = (errors: ErrorObject[] | null | undefined) =>
  (errors ?? [])
    .map((error) => {
      const path = error.instancePath.replace(/^\/solo/, "").replace(/~1/g, "/") || "/";
      const name =
        error.keyword === "propertyNames" && error.params.propertyName
          ? ` key "${error.params.propertyName}"`
          : "";
      return `${path}${name}: ${error.message}`;
    })
    .join("; ");

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Invalid slug");
const hostname = z
  .string()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/, "Invalid hostname");
const redirectSource = z
  .string()
  .regex(
    /^\/([a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*)?$/,
    "Redirect source must be a path like /feedback (letters, numbers, - and _ only)",
  );
const redirectTarget = z
  .string()
  .refine(
    (value) => /^\/(?!\/)\S*$/.test(value) || /^https:\/\/\S+$/.test(value),
    "Redirect target must be a /path or an https:// URL",
  );

// ---------------------------------------------------------------------------
// Reads: Edge Config SDK (read-only token)
// ---------------------------------------------------------------------------

/**
 * Reads the latest `solo` value using the read-only EDGE_CONFIG token.
 * `consistentRead` skips the edge caches so a read straight after a write sees it,
 * and a read-change-write never starts from a stale copy.
 */
export const readSoloEdgeConfigFresh = async (): Promise<SoloEdgeConfig> => {
  if (!process.env.EDGE_CONFIG) {
    throw new EdgeConfigWriteError("EDGE_CONFIG must be set");
  }

  try {
    return (await get<SoloEdgeConfig>(SOLO_KEY, { consistentRead: true })) ?? {};
  } catch (error) {
    throw new EdgeConfigWriteError(
      `Failed to read Edge Config: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

// ---------------------------------------------------------------------------
// Writes: Vercel REST API (access token)
// ---------------------------------------------------------------------------

const getWriteEnv = () => {
  const token = process.env.VERCEL_API_TOKEN;
  const edgeConfigId =
    process.env.EDGE_CONFIG_ID ?? process.env.EDGE_CONFIG?.match(/ecfg_[a-z0-9]+/i)?.[0];

  if (!token || !edgeConfigId) {
    throw new EdgeConfigWriteError("VERCEL_API_TOKEN and EDGE_CONFIG (or EDGE_CONFIG_ID) must be set");
  }

  const teamQuery = process.env.VERCEL_TEAM_ID
    ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`
    : "";

  return { token, edgeConfigId, teamQuery };
};

const writeSoloEdgeConfig = async (value: SoloEdgeConfig): Promise<void> => {
  if (!validateSoloDocument({ [SOLO_KEY]: value })) {
    throw new EdgeConfigValidationError(formatAjvErrors(validateSoloDocument.errors));
  }

  const { token, edgeConfigId, teamQuery } = getWriteEnv();
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamQuery}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ operation: "upsert", key: SOLO_KEY, value }] }),
  });

  if (!res.ok) {
    throw new EdgeConfigWriteError(`Failed to write Edge Config (${res.status}): ${await res.text()}`);
  }
};

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

type Actor = { userId: string; superAdmin: boolean };

const isSuperAdminMetadata = (metadata: Record<string, unknown>): boolean => {
  const adminFlags = Array.isArray(metadata.admin) ? metadata.admin : [];
  const organisations =
    metadata.organisations && typeof metadata.organisations === "object"
      ? (metadata.organisations as Record<string, unknown>)
      : {};

  return adminFlags.includes("superadmin") || adminFlags.includes("*") || "*" in organisations;
};

/** Throws unless the signed-in user is a member of `org` or a super admin. */
export const requireOrgAccess = async (org: string): Promise<Actor> => {
  if (!slug.safeParse(org).success) {
    throw new EdgeConfigValidationError(`Invalid organisation "${org}"`);
  }

  const user = await currentUser();
  if (!user) throw new EdgeConfigAccessError("Not signed in");

  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const superAdmin = isSuperAdminMetadata(metadata);
  const organisations =
    metadata.organisations && typeof metadata.organisations === "object"
      ? (metadata.organisations as Record<string, unknown>)
      : {};

  if (!superAdmin && !Object.prototype.hasOwnProperty.call(organisations, org)) {
    throw new EdgeConfigAccessError();
  }

  return { userId: user.id, superAdmin };
};

/** Access check → fresh read → mutate a clone → validate → write. */
const mutateForOrg = async (
  org: string,
  mutate: (config: SoloEdgeConfig, actor: Actor) => void | Promise<void>,
): Promise<SoloEdgeConfig> => {
  const actor = await requireOrgAccess(org);
  const config = structuredClone(await readSoloEdgeConfigFresh());
  await mutate(config, actor);
  await writeSoloEdgeConfig(config);
  return config;
};

// ---------------------------------------------------------------------------
// Readers (scoped to one org)
// ---------------------------------------------------------------------------

export type OrgSoloSettings = {
  domains: string[];
  theme: string | null;
  /**
   * Themes this org may switch to, from the theme definitions in ./solo-themes:
   * every public theme plus private themes that list this org.
   */
  availableThemes: { name: string; label: string; private: boolean }[];
  redirects: Record<string, string>;
  accountUrls: Record<string, string>;
  sanityProject: { projectId: string; dataset: string } | null;
};

/** Returns only the parts of the config that belong to `org`. */
export const getOrgSoloSettings = async (org: string): Promise<OrgSoloSettings> => {
  await requireOrgAccess(org);
  const config = await readSoloEdgeConfigFresh();
  const domains = config.domains?.[org] ?? [];

  return {
    domains,
    theme: Object.entries(config.themes ?? {}).find(([, orgs]) => orgs.includes(org))?.[0] ?? null,
    // Other orgs' private themes are left out entirely, so their names aren't exposed.
    availableThemes: getThemesForOrg(org).map((theme) => ({
      name: theme.name,
      label: theme.label,
      private: theme.access.visibility === "private",
    })),
    redirects: config.redirects?.[org] ?? {},
    // An account URL belongs to the org when its host is one of the org's domains.
    accountUrls: Object.fromEntries(
      Object.entries(config.accountUrls ?? {}).filter(([, url]) => {
        try {
          return domains.includes(new URL(url).hostname);
        } catch {
          return false;
        }
      }),
    ),
    sanityProject: config.sanityProjects?.[org] ?? null,
  };
};

/** Lists every defined theme name, public and private (for super-admin tooling). */
export const getAvailableThemes = (): string[] => soloThemeList.map((theme) => theme.name);

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

/**
 * Replaces the org's domain list. A domain already claimed by another org is rejected,
 * so one org can never take over another org's hostname. Pass [] to remove all domains.
 */
export const setOrgDomains = (org: string, domains: string[]) =>
  mutateForOrg(org, (config) => {
    const next = [...new Set(domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))];

    const invalid = next.filter((domain) => !hostname.safeParse(domain).success);
    if (invalid.length) {
      throw new EdgeConfigValidationError(`Invalid domain(s): ${invalid.join(", ")}`);
    }

    const claimed = Object.entries(config.domains ?? {})
      .filter(([owner]) => owner !== org)
      .flatMap(([owner, owned]) =>
        owned.filter((domain) => next.includes(domain.toLowerCase())).map((domain) => `${domain} (${owner})`),
      );
    if (claimed.length) {
      throw new EdgeConfigValidationError(`Domain(s) already in use: ${claimed.join(", ")}`);
    }

    config.domains = { ...config.domains };
    if (next.length) config.domains[org] = next;
    else delete config.domains[org];
  });

/**
 * Moves the org to an existing theme (removing it from any other theme group).
 * Access comes from the theme definitions in ./solo-themes: private themes can only be
 * chosen by the orgs they list. Super admins may assign any theme to any org.
 * Pass null to clear (falls back to "default").
 */
export const setOrgTheme = (org: string, theme: string | null) =>
  mutateForOrg(org, (config, actor) => {
    if (theme !== null) {
      if (!slug.safeParse(theme).success) {
        throw new EdgeConfigValidationError(`Invalid theme "${theme}"`);
      }
      if (!actor.superAdmin) {
        // Same message for unknown and other orgs' private themes, so private names can't be probed.
        if (!canOrgUseTheme(org, theme)) {
          throw new EdgeConfigValidationError(`Theme "${theme}" is not available to this organisation`);
        }
      }
    }

    const themes: Record<string, string[]> = {};
    for (const [key, orgs] of Object.entries(config.themes ?? {})) {
      const remaining = orgs.filter((member) => member !== org);
      if (remaining.length || key === theme) themes[key] = remaining;
    }

    if (theme !== null) {
      themes[theme] = [...(themes[theme] ?? []), org];
    }

    config.themes = themes;
  });

/**
 * Replaces the org's redirects. Keys are paths ("/feedback"), values are a /path or https:// URL.
 * Pass {} to remove all redirects.
 */
export const setOrgRedirects = (org: string, redirects: Record<string, string>) =>
  mutateForOrg(org, (config) => {
    const next: Record<string, string> = {};
    for (const [rawSource, rawTarget] of Object.entries(redirects)) {
      const source = rawSource.trim();
      const target = rawTarget.trim();
      const normalisedSource = source === "/" ? "/" : source.replace(/\/+$/, "");

      if (!redirectSource.safeParse(normalisedSource).success) {
        throw new EdgeConfigValidationError(`Invalid redirect source "${source}"`);
      }
      if (!redirectTarget.safeParse(target).success) {
        throw new EdgeConfigValidationError(`Invalid redirect target "${target}"`);
      }
      if (normalisedSource === target) {
        throw new EdgeConfigValidationError(`Redirect "${source}" points to itself`);
      }
      next[normalisedSource] = target;
    }

    config.redirects = { ...config.redirects };
    if (Object.keys(next).length) config.redirects[org] = next;
    else delete config.redirects[org];
  });

/** Looks up the org's Stripe account id from the Dance Engine API as the signed-in user. */
const fetchOrgAccountId = async (org: string): Promise<string | null> => {
  const api = process.env.NEXT_PUBLIC_DANCE_ENGINE_API;
  if (!api) throw new EdgeConfigWriteError("NEXT_PUBLIC_DANCE_ENGINE_API is not set");

  const token = await (await auth()).getToken();
  const res = await fetch(`${api}/${encodeURIComponent(org)}/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new EdgeConfigWriteError(`Failed to load organisation settings (${res.status})`);
  }

  const data = (await res.json()) as { organisation?: { account_id?: string } };
  return data.organisation?.account_id || null;
};

/**
 * Sets the return URL for the org's own Stripe account. The account id is taken from the
 * org's settings (never from the caller), and the URL must be https on one of the org's domains.
 * Super admins may pass `accountIdOverride` and skip the domain/https checks (e.g. localhost).
 * Pass url = null to remove it.
 */
export const setOrgAccountUrl = (org: string, url: string | null, accountIdOverride?: string) =>
  mutateForOrg(org, async (config, actor) => {
    const accountId = actor.superAdmin && accountIdOverride ? accountIdOverride : await fetchOrgAccountId(org);
    if (!accountId) {
      throw new EdgeConfigValidationError("Organisation has no Stripe account connected");
    }

    config.accountUrls = { ...config.accountUrls };

    if (url === null) {
      delete config.accountUrls[accountId];
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      throw new EdgeConfigValidationError(`Invalid URL "${url}"`);
    }

    if (!actor.superAdmin) {
      if (parsed.protocol !== "https:") {
        throw new EdgeConfigValidationError("Account URL must use https");
      }
      if (!(config.domains?.[org] ?? []).includes(parsed.hostname)) {
        throw new EdgeConfigValidationError(`${parsed.hostname} is not one of this organisation's domains`);
      }
    }

    config.accountUrls[accountId] = parsed.origin;
  });

/** Sets (or with null, removes) the org's Sanity project. */
export const setOrgSanityProject = (
  org: string,
  project: { projectId: string; dataset: string } | null,
) =>
  mutateForOrg(org, (config) => {
    config.sanityProjects = { ...config.sanityProjects };
    if (project) {
      config.sanityProjects[org] = {
        projectId: project.projectId.trim(),
        dataset: project.dataset.trim(),
      };
    } else {
      delete config.sanityProjects[org];
    }
  });
