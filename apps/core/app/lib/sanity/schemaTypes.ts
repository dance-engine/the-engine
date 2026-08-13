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

const threeColumnCalloutSection = defineType({
  name: "threeColumnCalloutSection",
  title: "Three column callout",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      description: "Keep this short so it works as a bold visual statement.",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "body", title: "Body", type: "blockContent" }),
    defineField({ name: "label", title: "Button label", type: "string" }),
    defineField({
      name: "href",
      title: "Button link",
      type: "url",
      validation: (rule) =>
        rule.uri({
          allowRelative: true,
          scheme: ["http", "https", "mailto", "tel"],
        }),
    }),
  ],
  preview: {
    select: { title: "heading", subtitle: "label" },
    prepare: ({ title, subtitle }) => ({
      title: title || "Untitled three column callout",
      subtitle: subtitle ? `Button: ${subtitle}` : "Three column callout",
    }),
  },
});

const socialProfile = defineType({
  name: "socialProfile",
  title: "Social profile",
  type: "document",
  fields: [
    defineField({
      name: "platform",
      title: "Platform",
      type: "string",
      options: {
        list: [
          { title: "Facebook", value: "facebook" },
          { title: "Instagram", value: "instagram" },
          { title: "TikTok", value: "tiktok" },
          { title: "YouTube", value: "youtube" },
          { title: "LinkedIn", value: "linkedin" },
          { title: "X / Twitter", value: "x" },
          { title: "Other", value: "other" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "label",
      title: "Display name",
      description: "For example, @danceengine or Dance Engine on YouTube.",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "url",
      title: "Profile address",
      type: "url",
      validation: (rule) => rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "showInFooter",
      title: "Show in footer",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "platform" },
    prepare: ({ title, subtitle }) => ({
      title: title || "Untitled social profile",
      subtitle: subtitle || "Social profile",
    }),
  },
});

const socialMediaSection = defineType({
  name: "socialMediaSection",
  title: "Social media",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Introduction", type: "text", rows: 3 }),
    defineField({
      name: "iconStyle",
      title: "Icon style",
      type: "string",
      initialValue: "colour",
      options: {
        layout: "radio",
        list: [
          { title: "Colour", value: "colour" },
          { title: "Monochrome", value: "monochrome" },
          { title: "Black and white", value: "blackWhite" },
        ],
      },
    }),
    defineField({
      name: "profiles",
      title: "Profiles to show",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "socialProfile" }],
          weak: true,
        }),
      ],
      validation: (rule) => rule.unique(),
    }),
  ],
  preview: {
    select: { title: "heading", profiles: "profiles" },
    prepare: ({ title, profiles }) => ({
      title: title || "Follow us",
      subtitle: `${Array.isArray(profiles) ? profiles.length : 0} profile${Array.isArray(profiles) && profiles.length === 1 ? "" : "s"}`,
    }),
  },
});

const testimonial = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "link",
      title: "Link",
      description: "Optional link for the person or organisation.",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "quote",
      title: "Full testimonial",
      description: "The complete testimonial from which the short excerpt is taken.",
      type: "blockContent",
    }),
    defineField({
      name: "shortQuote",
      title: "Highlighted excerpt",
      description: "A short, pithy excerpt copied from the full testimonial.",
      type: "text",
      rows: 2,
      validation: (rule) => [
        rule.required(),
        rule.max(180).warning("Highlighted excerpts work best below 180 characters."),
      ],
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "shortQuote", media: "image" },
    prepare: ({ title, subtitle, media }) => ({
      title: title || "Unnamed testimonial",
      subtitle: subtitle || "Testimonial",
      media,
    }),
  },
});

const testimonialsSection = defineType({
  name: "testimonialsSection",
  title: "Testimonials",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Introduction", type: "text", rows: 3 }),
    defineField({
      name: "testimonials",
      title: "Testimonials to show",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "testimonial" }], weak: true })],
      validation: (rule) => rule.unique(),
    }),
  ],
  preview: {
    select: { title: "heading", testimonials: "testimonials" },
    prepare: ({ title, testimonials }) => ({
      title: title || "Testimonials",
      subtitle: `${Array.isArray(testimonials) ? testimonials.length : 0} testimonial${Array.isArray(testimonials) && testimonials.length === 1 ? "" : "s"}`,
    }),
  },
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
      initialValue: { _ref: "site-primary" },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "title", title: "Page title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "Page address", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "seoDescription", title: "Search description", type: "text", rows: 3 }),
    defineField({ name: "sections", title: "Page sections", description: "Drag sections to change their order.", type: "array", of: [defineArrayMember({ type: "heroSection" }), defineArrayMember({ type: "richTextSection" }), defineArrayMember({ type: "imageTextSection" }), defineArrayMember({ type: "callToActionSection" }), defineArrayMember({ type: "threeColumnCalloutSection" }), defineArrayMember({ type: "socialMediaSection" }), defineArrayMember({ type: "testimonialsSection" }), defineArrayMember({ type: "faqSection" })] }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});

export const schemaTypes = [blockContent, heroSection, richTextSection, imageTextSection, callToActionSection, threeColumnCalloutSection, socialProfile, socialMediaSection, testimonial, testimonialsSection, faqItem, faqSection, site, page];
