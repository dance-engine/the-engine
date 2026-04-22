import { get } from "@vercel/edge-config";

export type SoloEdgeConfig = {
  redirects?: Record<string, string>;
  domains?: Record<string, string[]>;
  themes?: Record<string, string[]>;
  accountUrls?: Record<string, string>;
};

type DomainGroups = Record<string, string[]>;

export const getSoloEdgeConfig = async (): Promise<SoloEdgeConfig | null> => {
  try {
    const edgeConfig = await get<SoloEdgeConfig>("solo");
    return edgeConfig ?? null;
  } catch (error) {
    console.error("Error fetching solo edge config:", error);
    return null;
  }
};

export const toDomainLookupMap = (grouped: DomainGroups): Record<string, string> => {
  return Object.entries(grouped).reduce<Record<string, string>>((acc, [key, domains]) => {
    domains.forEach((domain) => {
      acc[domain] = key;
    });
    return acc;
  }, {});
};

export const resolveOrgFromDomainGroups = (
  hostname: string,
  domainGroups?: Record<string, string[]>,
): string => {
  if (!domainGroups) {
    return "default-org";
  }

  const normalizedHost = hostname.toLowerCase();
  const matched = Object.entries(domainGroups).find(([, domains]) =>
    domains.some((domain) => domain.toLowerCase() === normalizedHost),
  );

  return matched?.[0] || "default-org";
};

export const resolveThemeFromThemeGroups = (
  org: string,
  themeGroups?: Record<string, string[]>,
): string => {
  if (!themeGroups) {
    return "default";
  }

  const matched = Object.entries(themeGroups).find(([, orgs]) => orgs.includes(org));
  return matched?.[0] || "default";
};

export const fallbackAccountUrls: Record<string, string> = {
  acct_1RnpiyD1ZofqWwLa: "https://iamrebel.co.uk",
  acct_1Rkp1ODIMY9TzhzF: "https://powerofwomansbk.co.uk",
  acct_1TACbkDnZQBrVCD7: "https://www.cubanydominican.com",
  acct_1RT4baRWBoTdG7OY: "http://localhost:3003",
};

export const defaultAccountUrl = "https://danceengine.co.uk";

export const getUrlOfAccount = (
  accountId: string,
  accountUrls: Record<string, string> = fallbackAccountUrls,
): string => accountUrls[accountId] || defaultAccountUrl;
