"use client";

import { NextStudio } from "next-sanity/studio";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { PageEditorShell } from "../../lib/sanity/PageEditorShell";
import { schemaTypes } from "../../lib/sanity/schemaTypes";

export default function ContentStudio({ projectId, dataset }: { projectId: string; dataset: string }) {
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
          ]),
      }),
    ],
    schema: { types: schemaTypes },
    form: {
      components: {
        input: PageEditorShell,
      },
    },
  });

  return <NextStudio config={config} />;
}
