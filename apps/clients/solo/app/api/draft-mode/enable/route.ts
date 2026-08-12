import { headers } from "next/headers";
import { createClient } from "next-sanity";
import { defineEnableDraftMode } from "next-sanity/draft-mode";
import {
  getSanityPreviewToken,
  getSanityProjectForOrganisation,
} from "@/lib/sanity/projects";

export async function GET(request: Request) {
  const organisation = (await headers()).get("x-site-org") || "default-org";
  const project = await getSanityProjectForOrganisation(organisation);

  if (!project) {
    return new Response("Website content is not configured", { status: 404 });
  }

  const token = getSanityPreviewToken(project.projectId);
  if (!token) {
    console.error(`No Sanity preview token is configured for project ${project.projectId}`);
    return new Response("Website preview is not configured", { status: 500 });
  }

  const client = createClient({
    projectId: project.projectId,
    dataset: project.dataset,
    apiVersion: "2026-08-01",
    useCdn: false,
    token,
  });

  return defineEnableDraftMode({
    client,
    secureDevMode: process.env.NODE_ENV === "development",
  }).GET(request);
}
