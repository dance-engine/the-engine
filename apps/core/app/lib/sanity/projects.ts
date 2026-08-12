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

export async function getSanityProjectForOrganisation(
  organisation: string | null | undefined,
): Promise<SanityProjectConfig | null> {
  if (!organisation) return null;

  const edgeConfig = await getSoloEdgeConfig() as EdgeConfigWithSanityProjects | null;
  const project = edgeConfig?.sanityProjects?.[organisation];

  return isSanityProjectConfig(project)
    ? project
    : getEnvironmentProject(organisation);
}
