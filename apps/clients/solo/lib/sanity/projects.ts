import "server-only";

import { getSoloEdgeConfig } from "@dance-engine/utils/solo-edge-config";

export type SanityProjectConfig = {
  projectId: string;
  dataset: string;
};

type EdgeConfigWithSanityProjects = {
  sanityProjects?: Record<string, SanityProjectConfig>;
};

function isSanityProjectConfig(value: unknown): value is SanityProjectConfig {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<SanityProjectConfig>;
  return typeof project.projectId === "string" && typeof project.dataset === "string";
}

function getEnvironmentProject(organisation: string): SanityProjectConfig | null {
  if (!process.env.SANITY_PROJECTS_JSON) return null;

  try {
    const projects = JSON.parse(process.env.SANITY_PROJECTS_JSON) as Record<string, unknown>;
    const project = projects[organisation];
    return isSanityProjectConfig(project) ? project : null;
  } catch {
    console.error("SANITY_PROJECTS_JSON is not valid JSON");
    return null;
  }
}

function getEnvironmentProjects(): Record<string, SanityProjectConfig> {
  if (!process.env.SANITY_PROJECTS_JSON) return {};

  try {
    const projects = JSON.parse(process.env.SANITY_PROJECTS_JSON) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(projects).filter(
        (entry): entry is [string, SanityProjectConfig] => isSanityProjectConfig(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export async function getSanityProjectForOrganisation(
  organisation: string,
): Promise<SanityProjectConfig | null> {
  const edgeConfig = await getSoloEdgeConfig() as EdgeConfigWithSanityProjects | null;
  const project = edgeConfig?.sanityProjects?.[organisation];

  return isSanityProjectConfig(project)
    ? project
    : getEnvironmentProject(organisation);
}

export async function isKnownSanityProject(
  projectId: string,
  dataset: string,
): Promise<boolean> {
  const edgeConfig = await getSoloEdgeConfig() as EdgeConfigWithSanityProjects | null;
  const configuredProjects = [
    ...Object.values(edgeConfig?.sanityProjects || {}),
    ...Object.values(getEnvironmentProjects()),
  ];

  return configuredProjects.some(
    (project) =>
      isSanityProjectConfig(project) &&
      project.projectId === projectId &&
      project.dataset === dataset,
  );
}
