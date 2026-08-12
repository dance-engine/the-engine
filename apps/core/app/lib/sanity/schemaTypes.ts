import { defineArrayMember, defineField, defineType } from "sanity";
import { SectionPreview } from "./PageEditorShell";

const blockContent = defineType({
  name: "blockContent",
  title: "Content",
  type: "array",
  of: [defineArrayMember({ type: "block" })],
});

const heroSection = defineType({
  name: "heroSection",
  title: "Hero",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Introduction", type: "text", rows: 3 }),
    defineField({ name: "image", title: "Background image", type: "image", options: { hotspot: true } }),
  ],
  preview: { select: { title: "heading", media: "image" }, prepare: ({ title, media }) => ({ title: title || "Untitled hero", subtitle: "Hero", media }) },
});

const richTextSection = defineType({
  name: "richTextSection",
  title: "Text",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Body", type: "blockContent" }),
  ],
  preview: { select: { title: "heading" }, prepare: ({ title }) => ({ title: title || "Untitled text section", subtitle: "Text" }) },
});

const imageTextSection = defineType({
  name: "imageTextSection",
  title: "Image and text",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Body", type: "blockContent" }),
    defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true } }),
    defineField({
      name: "imageHref",
      title: "Image link",
      description: "Optional. Opens this address when the image is selected.",
      type: "url",
      validation: (rule) =>
        rule.uri({
          allowRelative: true,
          scheme: ["http", "https", "mailto", "tel"],
        }),
    }),
    defineField({
      name: "imageAspectRatio",
      title: "Image aspect ratio",
      type: "string",
      options: {
        list: [
          { title: "Original", value: "original" },
          { title: "Square (1:1)", value: "1:1" },
          { title: "Portrait (9:16)", value: "9:16" },
          { title: "Widescreen (16:9)", value: "16:9" },
          { title: "Landscape (4:3)", value: "4:3" },
        ],
      },
      initialValue: "original",
    }),
    defineField({ name: "imagePosition", title: "Image position", type: "string", initialValue: "left", options: { layout: "radio", list: [{ title: "Left", value: "left" }, { title: "Right", value: "right" }] } }),
  ],
  preview: { select: { title: "heading", media: "image" }, prepare: ({ title, media }) => ({ title: title || "Untitled image section", subtitle: "Image and text", media }) },
});

const callToActionSection = defineType({
  name: "callToActionSection",
  title: "Call to action",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Body", type: "text", rows: 3 }),
    defineField({ name: "label", title: "Button label", type: "string" }),
    defineField({ name: "href", title: "Button link", type: "url", validation: (rule) => rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto", "tel"] }) }),
  ],
  preview: { select: { title: "heading", subtitle: "label" }, prepare: ({ title, subtitle }) => ({ title: title || "Untitled call to action", subtitle: subtitle ? `Button: ${subtitle}` : "Call to action" }) },
});

const faqItem = defineType({
  name: "faqItem",
  title: "Question and answer",
  type: "object",
  fields: [
    defineField({ name: "question", title: "Question", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "answer", title: "Answer", type: "text", rows: 4, validation: (rule) => rule.required() }),
  ],
  preview: {
    select: { title: "question", subtitle: "answer" },
    prepare: ({ title, subtitle }) => ({
      title: title || "Untitled question",
      subtitle,
    }),
  },
});

const faqSection = defineType({
  name: "faqSection",
  title: "Frequently asked questions",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({
      name: "items",
      title: "Questions",
      type: "array",
      of: [defineArrayMember({ type: "faqItem" })],
    }),
  ],
  preview: {
    select: { title: "heading", items: "items" },
    prepare: ({ title, items }) => ({
      title: title || "Frequently asked questions",
      subtitle: `${Array.isArray(items) ? items.length : 0} question${Array.isArray(items) && items.length === 1 ? "" : "s"}`,
    }),
  },
});

const site = defineType({
  name: "site",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Site title", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "siteKey",
      title: "Site key",
      type: "slug",
      hidden: true,
      initialValue: { current: "primary" },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "defaultDescription", title: "Default SEO description", type: "text", rows: 3 }),
  ],
});

const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({
      name: "site",
      title: "Site",
      type: "reference",
      to: [{ type: "site" }],
      hidden: true,
      initialValue: { _ref: "site-primary", _type: "reference" },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "title", title: "Page title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "Page address", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "seoDescription", title: "Search description", type: "text", rows: 3 }),
    defineField({ name: "sections", title: "Page sections", description: "Drag sections to change their order.", type: "array", of: [defineArrayMember({ type: "heroSection" }), defineArrayMember({ type: "richTextSection" }), defineArrayMember({ type: "imageTextSection" }), defineArrayMember({ type: "callToActionSection" }), defineArrayMember({ type: "faqSection" })] }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});

export const schemaTypes = [blockContent, heroSection, richTextSection, imageTextSection, callToActionSection, faqItem, faqSection, site, page];
