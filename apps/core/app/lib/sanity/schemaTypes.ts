import { defineArrayMember, defineField, defineType } from "sanity";
import { MenuJumpSelectInput } from "./MenuJumpSelectInput";
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
    defineField({
      name: "featureImage",
      title: "Side image",
      description: "Optional. Shown beside the heading and introduction (above them on phones).",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", description: "Describe the image for people who can't see it.", type: "string" })],
    }),
    defineField({
      name: "featureImagePosition",
      title: "Side image position",
      type: "string",
      initialValue: "right",
      options: { layout: "radio", list: [{ title: "Left", value: "left" }, { title: "Right", value: "right" }] },
      hidden: ({ parent }) => !parent?.featureImage,
    }),
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
          { title: "Panorama (3:1)", value: "3:1" },
          { title: "Landscape (4:3)", value: "4:3" },
        ],
      },
      initialValue: "original",
    }),
    defineField({
      name: "imageWidth",
      title: "Image width",
      description: "How much of the row the image takes on larger screens; the text gets the rest. On phones the image and text stack.",
      type: "string",
      options: {
        layout: "radio",
        list: [
          { title: "One third", value: "1/3" },
          { title: "Half", value: "1/2" },
          { title: "Two thirds", value: "2/3" },
        ],
      },
      initialValue: "1/2",
    }),
    defineField({ name: "imagePosition", title: "Image position", type: "string", initialValue: "left", options: { layout: "radio", list: [{ title: "Left", value: "left" }, { title: "Right", value: "right" }] } }),
  ],
  preview: { select: { title: "heading", media: "image" }, prepare: ({ title, media }) => ({ title: title || "Untitled image section", subtitle: "Image and text", media }) },
});

const imageSection = defineType({
  name: "imageSection",
  title: "Image",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          description: "Describe the image for people who cannot see it.",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "aspectRatio",
      title: "Aspect ratio",
      type: "string",
      initialValue: "original",
      options: {
        list: [
          { title: "Original", value: "original" },
          { title: "Square (1:1)", value: "1:1" },
          { title: "Portrait (9:16)", value: "9:16" },
          { title: "Widescreen (16:9)", value: "16:9" },
          { title: "Panorama (3:1)", value: "3:1" },
          { title: "Landscape (4:3)", value: "4:3" },
        ],
      },
    }),
    defineField({
      name: "href",
      title: "Image link",
      description: "Optional. Opens this address when the image is selected.",
      type: "url",
      validation: (rule) => rule.uri({
        allowRelative: true,
        scheme: ["http", "https", "mailto", "tel"],
      }),
    }),
  ],
  preview: {
    select: { title: "image.alt", media: "image" },
    prepare: ({ title, media }) => ({
      title: title || "Image",
      subtitle: "Image",
      media,
    }),
  },
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

const sectionGrid = defineType({
  name: "sectionGrid",
  title: "Section grid",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Introduction", type: "text", rows: 3 }),
    defineField({
      name: "maxColumns",
      title: "Maximum columns",
      description: "The grid automatically uses fewer columns on narrower screens.",
      type: "number",
      initialValue: 3,
      options: {
        layout: "radio",
        list: [
          { title: "2", value: 2 },
          { title: "3", value: 3 },
          { title: "4", value: 4 },
          { title: "5", value: 5 },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "items",
      title: "Sections",
      description: "Add and reorder sections within the grid.",
      type: "array",
      of: [
        defineArrayMember({ type: "heroSection" }),
        defineArrayMember({ type: "richTextSection" }),
        defineArrayMember({ type: "imageTextSection" }),
        defineArrayMember({ type: "imageSection" }),
        defineArrayMember({ type: "callToActionSection" }),
        defineArrayMember({ type: "threeColumnCalloutSection" }),
        defineArrayMember({ type: "socialMediaSection" }),
        defineArrayMember({ type: "testimonialsSection" }),
        defineArrayMember({ type: "faqSection" }),
      ],
    }),
  ],
  preview: {
    select: { title: "heading", items: "items", maxColumns: "maxColumns" },
    prepare: ({ title, items, maxColumns }) => ({
      title: title || "Section grid",
      subtitle: `${Array.isArray(items) ? items.length : 0} section${Array.isArray(items) && items.length === 1 ? "" : "s"}, up to ${maxColumns || 3} columns`,
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

type MenuJumpSectionValue = { _key?: string; anchor?: { current?: string } };

// Invisible #anchor on the page; a Menu section's links can point to it.
const menuJumpSection = defineType({
  name: "menuJumpSection",
  title: "Menu jump",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Names this point on the page when you pick it in a Menu section link.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "showTitle",
      title: "Show title on page",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "anchor",
      title: "Anchor",
      type: "slug",
      description: "The #link for this point on the page. Generate it from the title.",
      options: {
        source: (_document, context) => (context.parent as { title?: string } | undefined)?.title || "",
        // Anchors only need to be unique within their own page (checked below), not across documents.
        isUnique: () => true,
      },
      validation: (rule) =>
        rule.required().custom((value, context) => {
          const anchor = value?.current;
          if (!anchor) return true;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(anchor)) {
            return "Use lowercase letters, numbers and dashes only";
          }

          const sections = (context.document?.sections || []) as MenuJumpSectionValue[];
          const ownKey = (context.parent as MenuJumpSectionValue | undefined)?._key;
          const duplicate = sections.some(
            (section) => section?._key !== ownKey && section?.anchor?.current === anchor,
          );
          return duplicate ? "Another menu jump on this page already uses this anchor" : true;
        }),
    }),
  ],
  preview: {
    select: { title: "title", anchor: "anchor.current", showTitle: "showTitle" },
    prepare: ({ title, anchor, showTitle }) => ({
      title: `Menu jump: ${title || "Untitled"}`,
      subtitle: `${anchor ? `#${anchor}` : "No anchor yet"}${showTitle ? " · title shown" : " · hidden"}`,
    }),
  },
});

type MenuLinkValue = { linkType?: "jump" | "url"; jump?: string; url?: string };
type PageSectionValue = MenuJumpSectionValue & { _type?: string };

const menuLink = defineType({
  name: "menuLink",
  title: "Menu link",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Label", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "linkType",
      title: "Links to",
      type: "string",
      options: {
        list: [
          { title: "A menu jump on this page", value: "jump" },
          { title: "A web address", value: "url" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "jump",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "jump",
      title: "Menu jump",
      type: "string",
      components: { input: MenuJumpSelectInput },
      hidden: ({ parent }) => (parent as MenuLinkValue | undefined)?.linkType !== "jump",
      validation: (rule) =>
        rule.custom((value, context) => {
          if ((context.parent as MenuLinkValue | undefined)?.linkType !== "jump") return true;
          if (!value) return "Choose a menu jump";
          const sections = (context.document?.sections || []) as PageSectionValue[];
          const exists = sections.some(
            (section) => section?._type === "menuJumpSection" && section.anchor?.current === value,
          );
          return exists ? true : "That menu jump is no longer on this page";
        }),
    }),
    defineField({
      name: "url",
      title: "Web address",
      description: "Full addresses (https://…) open in a new tab. Use a path such as /events for pages on this site.",
      type: "url",
      hidden: ({ parent }) => (parent as MenuLinkValue | undefined)?.linkType !== "url",
      validation: (rule) =>
        rule
          .uri({ allowRelative: true, scheme: ["http", "https", "mailto", "tel"] })
          .custom((value, context) =>
            (context.parent as MenuLinkValue | undefined)?.linkType === "url" && !value
              ? "Enter a web address"
              : true,
          ),
    }),
  ],
  preview: {
    select: { title: "label", linkType: "linkType", jump: "jump", url: "url" },
    prepare: ({ title, linkType, jump, url }) => ({
      title: title || "Untitled link",
      subtitle: linkType === "url" ? url || "No address yet" : jump ? `#${jump}` : "No menu jump chosen",
    }),
  },
});

// Not shown on the page: its links form the header menu on single-page sites.
const menuSection = defineType({
  name: "menuSection",
  title: "Menu",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({
      name: "items",
      title: "Links",
      description: "Shown in the header menu in this order.",
      type: "array",
      of: [defineArrayMember({ type: "menuLink" })],
    }),
  ],
  validation: (rule) =>
    rule.custom((_value, context) => {
      const sections = (context.document?.sections || []) as PageSectionValue[];
      const menus = sections.filter((section) => section?._type === "menuSection").length;
      return menus > 1 ? "Only one Menu section is used per page (the first one)" : true;
    }).warning(),
  preview: {
    select: { items: "items" },
    prepare: ({ items }) => {
      const count = Array.isArray(items) ? items.length : 0;
      return { title: "Menu", subtitle: `${count} link${count === 1 ? "" : "s"} · header menu, not shown on the page` };
    },
  },
});

// Live events for the organisation, loaded from Dance Engine (not edited in Sanity).
const eventListSection = defineType({
  name: "eventListSection",
  title: "Events listing",
  type: "object",
  components: { preview: SectionPreview },
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Body", type: "text", rows: 3 }),
  ],
  preview: {
    select: { title: "heading" },
    prepare: ({ title }) => ({ title: title || "Events listing", subtitle: "Live events from Dance Engine" }),
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
      // Weak so pages can be saved before the site-primary settings document exists.
      weak: true,
      hidden: true,
      // initialValue is used verbatim, so the reference must be marked weak here too.
      initialValue: { _ref: "site-primary", _weak: true },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "title", title: "Page title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "Page address", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "seoDescription", title: "Search description", type: "text", rows: 3 }),
    defineField({ name: "sections", title: "Page sections", description: "Drag sections to change their order.", type: "array", of: [defineArrayMember({ type: "heroSection" }), defineArrayMember({ type: "richTextSection" }), defineArrayMember({ type: "imageTextSection" }), defineArrayMember({ type: "imageSection" }), defineArrayMember({ type: "callToActionSection" }), defineArrayMember({ type: "threeColumnCalloutSection" }), defineArrayMember({ type: "socialMediaSection" }), defineArrayMember({ type: "testimonialsSection" }), defineArrayMember({ type: "sectionGrid" }), defineArrayMember({ type: "faqSection" }), defineArrayMember({ type: "menuSection" }), defineArrayMember({ type: "menuJumpSection" }), defineArrayMember({ type: "eventListSection" })] }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});

export const schemaTypes = [blockContent, heroSection, richTextSection, imageTextSection, imageSection, callToActionSection, threeColumnCalloutSection, socialProfile, socialMediaSection, testimonial, testimonialsSection, sectionGrid, faqItem, faqSection, menuLink, menuSection, menuJumpSection, eventListSection, site, page];
