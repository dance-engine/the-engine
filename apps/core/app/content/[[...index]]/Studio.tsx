"use client";

import { defineConfig, Studio } from "sanity";
import { defineDocuments, defineLocations, presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { MobilePresentationLayout } from "../../lib/sanity/MobilePresentationLayout";
import { PageEditorShell } from "../../lib/sanity/PageEditorShell";
import { createPublishWithLinkedProfilesAction } from "../../lib/sanity/PublishWithLinkedProfilesAction";
import { schemaTypes } from "../../lib/sanity/schemaTypes";

const mainDocuments = defineDocuments([
  {
    route: "/:slug",
    filter: `_type == "page" && slug.current == $slug`,
  },
]);

const locations = {
  page: defineLocations({
    select: {
      title: "title",
      slug: "slug.current",
    },
    resolve: (document) => ({
      locations: document?.slug
        ? [{ title: document.title || "Untitled page", href: `/${document.slug}` }]
        : [],
    }),
  }),
};

export default function ContentStudio({
  projectId,
  dataset,
  previewOrigin,
}: {
  projectId: string;
  dataset: string;
  previewOrigin: string | null;
}) {
  const config = defineConfig({
    name: "dance-engine-website",
    title: "Website",
    projectId,
    dataset,
    basePath: "/content",
    plugins: [
      structureTool({
        structure: (builder) =>
          builder.list().title("Website").items([
            builder.listItem().title("Pages").schemaType("page").child(builder.documentTypeList("page").title("Pages")),
            builder.divider(),
            builder.listItem().title("Site settings").schemaType("site").child(builder.documentTypeList("site").title("Site settings")),
            builder.listItem().title("Social media").schemaType("socialProfile").child(builder.documentTypeList("socialProfile").title("Social media")),
            builder.listItem().title("Testimonials").schemaType("testimonial").child(builder.documentTypeList("testimonial").title("Testimonials")),
          ]),
      }),
      ...(previewOrigin ? [presentationTool({
        previewUrl: {
          initial: async ({ client }) => {
            const slug = await client.fetch<string | null>(
              `*[
                _type == "page" &&
                defined(slug.current) &&
                count(string::split(slug.current, "/")) == 1
              ] | order(title asc)[0].slug.current`,
            );

            return new URL(slug ? `/${slug}` : "/", previewOrigin).toString();
          },
          previewMode: {
            enable: "/api/draft-mode/enable",
            disable: "/api/draft-mode/disable",
          },
        },
        allowOrigins: [previewOrigin],
        resolve: { locations, mainDocuments },
      })] : []),
    ],
    schema: { types: schemaTypes },
    document: {
      actions: (previousActions, context) => {
        if (context.schemaType !== "page") return previousActions;

        const publishAction = previousActions.find((action) => action.action === "publish");
        if (!publishAction) return previousActions;

        return [
          ...previousActions,
          createPublishWithLinkedProfilesAction(publishAction, context),
        ];
      },
    },
    form: {
      components: {
        input: PageEditorShell,
      },
    },
    studio: {
      components: {
        activeToolLayout: MobilePresentationLayout,
      },
    },
  });

  return <Studio config={config} />;
}
