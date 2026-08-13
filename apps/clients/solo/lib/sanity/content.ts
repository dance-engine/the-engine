import "server-only";

import { createClient } from "next-sanity";
import type { SanityProjectConfig } from "./projects";

export type PortableTextBlock = {
  _key: string;
  _type: "block";
  children?: Array<{
    _key: string;
    _type: "span";
    text: string;
    marks?: string[];
  }>;
  markDefs?: Array<Record<string, unknown>>;
  style?: string;
};

type SanityImage = {
  _type?: "image";
  alt?: string;
  asset?: { _ref?: string; url?: string };
  crop?: { top: number; bottom: number; left: number; right: number };
  hotspot?: { x: number; y: number; height: number; width: number };
};

export type PageSection =
  | { _key: string; _type: "heroSection"; heading?: string; body?: string; image?: SanityImage }
  | { _key: string; _type: "richTextSection"; heading?: string; body?: PortableTextBlock[] }
  | { _key: string; _type: "imageTextSection"; heading?: string; body?: PortableTextBlock[]; image?: SanityImage; imageHref?: string; imageAspectRatio?: "original" | "1:1" | "9:16" | "16:9" | "4:3"; imagePosition?: "left" | "right" }
  | { _key: string; _type: "callToActionSection"; heading?: string; body?: string; label?: string; href?: string }
  | { _key: string; _type: "threeColumnCalloutSection"; heading?: string; body?: PortableTextBlock[]; label?: string; href?: string }
  | { _key: string; _type: "socialMediaSection"; heading?: string; body?: string; iconStyle?: "colour" | "monochrome" | "blackWhite"; profiles?: Array<SocialProfile | null> }
  | { _key: string; _type: "testimonialsSection"; heading?: string; body?: string; testimonials?: Array<Testimonial | null> }
  | { _key: string; _type: "faqSection"; heading?: string; items?: Array<{ _key: string; question?: string; answer?: string }> };

export type SocialProfile = {
  _id: string;
  platform: "facebook" | "instagram" | "tiktok" | "youtube" | "linkedin" | "x" | "other";
  label: string;
  url: string;
  showInFooter?: boolean;
};

export type Testimonial = {
  _id: string;
  name: string;
  link?: string;
  image?: SanityImage;
  shortQuote: string;
  quote?: PortableTextBlock[];
};

export type SanityContentPage = {
  _id: string;
  title: string;
  slug: string;
  seoDescription?: string;
  sections?: PageSection[];
};

export type SanityNavigationPage = {
  _id: string;
  title: string;
  slug: string;
};

const pageQuery = `*[
  _type == "page" &&
  slug.current == $slug
][0]{
  _id,
  title,
  "slug": slug.current,
  seoDescription,
  sections[]{
    ...,
    profiles[]-> {
      _id,
      platform,
      label,
      url,
      showInFooter
    },
    testimonials[]-> {
      _id,
      name,
      link,
      shortQuote,
      quote,
      image{
        _type,
        alt,
        crop,
        hotspot,
        asset{
          _ref,
          "url": @->url
        }
      }
    },
    image{
      _type,
      alt,
      crop,
      hotspot,
      asset{
        _ref,
        "url": @->url
      }
    }
  }
}`;

const navigationQuery = `*[
  _type == "page" &&
  defined(slug.current) &&
  count(string::split(slug.current, "/")) == 1
] | order(title asc){
  _id,
  title,
  "slug": slug.current
}`;

function createPublishedClient(project: SanityProjectConfig) {
  return createClient({
    projectId: project.projectId,
    dataset: project.dataset,
    apiVersion: "2026-08-01",
    useCdn: process.env.NODE_ENV !== "development",
    perspective: "published",
  });
}

const publishedContentRevalidate = process.env.NODE_ENV === "development" ? 0 : 60;

export async function getPublishedContentPage(
  project: SanityProjectConfig,
  slug: string,
): Promise<SanityContentPage | null> {
  const client = createPublishedClient(project);

  return client.fetch<SanityContentPage | null>(pageQuery, { slug }, {
    next: {
      revalidate: publishedContentRevalidate,
      tags: [`sanity-page:${project.projectId}:${slug}`],
    },
  });
}

export async function getPreviewContentPage(
  project: SanityProjectConfig,
  slug: string,
  token: string,
  studioUrl: string,
): Promise<SanityContentPage | null> {
  const client = createClient({
    projectId: project.projectId,
    dataset: project.dataset,
    apiVersion: "2026-08-01",
    useCdn: false,
    perspective: "drafts",
    token,
    stega: {
      enabled: true,
      studioUrl,
    },
  });

  return client.fetch<SanityContentPage | null>(
    pageQuery,
    { slug },
    { cache: "no-store" },
  );
}

export async function getPublishedNavigationPages(
  project: SanityProjectConfig,
): Promise<SanityNavigationPage[]> {
  return createPublishedClient(project).fetch<SanityNavigationPage[]>(
    navigationQuery,
    {},
    {
      next: {
        revalidate: publishedContentRevalidate,
        tags: [`sanity-navigation:${project.projectId}`],
      },
    },
  );
}
