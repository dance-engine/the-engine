import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { parseBody } from "next-sanity/webhook";
import { isKnownSanityProject } from "@/lib/sanity/projects";

type SanityWebhookPayload = {
  _id?: string;
  _type?: string;
  projectId?: string;
  dataset?: string;
  previousSlug?: string | null;
  slug?: string | null;
};

function isUsableSlug(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

function isUsableDocumentId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

async function getPagesReferencingDocument(
  projectId: string,
  dataset: string,
  documentId: string,
): Promise<string[]> {
  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2026-08-01",
    useCdn: false,
    perspective: "published",
  });

  return client.fetch<string[]>(
    `*[
      _type == "page" &&
      defined(slug.current) &&
      references($documentId)
    ].slug.current`,
    { documentId: documentId.replace(/^drafts\./, "") },
    { cache: "no-store" },
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    console.error("SANITY_REVALIDATE_SECRET is not configured");
    return NextResponse.json({ message: "Webhook is not configured" }, { status: 500 });
  }

  try {
    const { body, isValidSignature } = await parseBody<SanityWebhookPayload>(
      request,
      secret,
      true,
    );

    if (!isValidSignature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    if (!body?.projectId || !body.dataset) {
      return NextResponse.json({ message: "Invalid webhook payload" }, { status: 400 });
    }

    if (!(await isKnownSanityProject(body.projectId, body.dataset))) {
      return NextResponse.json({ message: "Unknown Sanity project" }, { status: 403 });
    }

    const tags = new Set<string>();

    if (body._type === "page") {
      if (!isUsableSlug(body.slug) && !isUsableSlug(body.previousSlug)) {
        return NextResponse.json({ message: "Invalid webhook payload" }, { status: 400 });
      }

      tags.add(`sanity-navigation:${body.projectId}`);

      if (isUsableSlug(body.slug)) {
        tags.add(`sanity-page:${body.projectId}:${body.slug}`);
      }
      if (isUsableSlug(body.previousSlug)) {
        tags.add(`sanity-page:${body.projectId}:${body.previousSlug}`);
      }
    } else if (
      (body._type === "socialProfile" || body._type === "testimonial") &&
      isUsableDocumentId(body._id)
    ) {
      const pageSlugs = await getPagesReferencingDocument(
        body.projectId,
        body.dataset,
        body._id,
      );

      pageSlugs.filter(isUsableSlug).forEach((slug) => {
        tags.add(`sanity-page:${body.projectId}:${slug}`);
      });
    } else {
      return NextResponse.json({ message: "Invalid webhook payload" }, { status: 400 });
    }

    tags.forEach((tag) => revalidateTag(tag));

    return NextResponse.json({ revalidated: [...tags] });
  } catch (error) {
    console.error("Unable to process Sanity revalidation webhook", error);
    return NextResponse.json({ message: "Unable to process webhook" }, { status: 500 });
  }
}
