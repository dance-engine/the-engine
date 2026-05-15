import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Strike from "@tiptap/extension-strike";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Heading from "@tiptap/extension-heading";
import Blockquote from "@tiptap/extension-blockquote";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import BulletedList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Link from "@tiptap/extension-link";
import HardBreak from "@tiptap/extension-hard-break";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

export const RICH_TEXT_ALLOWED_NODE_TYPES = [
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "horizontalRule",
  "bulletList",
  "orderedList",
  "listItem",
  "hardBreak",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
] as const;

export const RICH_TEXT_ALLOWED_MARK_TYPES = [
  "bold",
  "strike",
  "italic",
  "underline",
  "highlight",
  "link",
] as const;

const richTextSharedExtensions = [
  Document,
  Paragraph,
  Text,
  Bold,
  Strike,
  Italic,
  Underline,
  Highlight,
  Heading,
  Blockquote,
  HorizontalRule,
  ListItem,
  BulletedList,
  OrderedList,
  HardBreak,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

export const richTextRenderExtensions = [
  ...richTextSharedExtensions,
  Link,
];

export const richTextEditorExtensions = [
  ...richTextSharedExtensions,
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    protocols: ["http", "https"],
    isAllowedUri: (
      url: string,
      ctx: {
        defaultProtocol: string;
        protocols: (string | { scheme: string })[];
        defaultValidate: (url: string) => boolean;
      },
    ) => {
      try {
        const parsedUrl = url.includes(":")
          ? new URL(url)
          : new URL(`${ctx.defaultProtocol}://${url}`);

        if (!ctx.defaultValidate(parsedUrl.href)) {
          return false;
        }

        const disallowedProtocols = ["ftp", "file", "mailto"];
        const protocol = parsedUrl.protocol.replace(":", "");
        if (disallowedProtocols.includes(protocol)) {
          return false;
        }

        const allowedProtocols = ctx.protocols.map((p) =>
          typeof p === "string" ? p : p.scheme,
        );
        if (!allowedProtocols.includes(protocol)) {
          return false;
        }

        const disallowedDomains = ["example-phishing.com", "malicious-site.net"];
        return !disallowedDomains.includes(parsedUrl.hostname);
      } catch {
        return false;
      }
    },
    shouldAutoLink: (url: string) => {
      try {
        const parsedUrl = url.includes(":")
          ? new URL(url)
          : new URL(`https://${url}`);
        const disallowedDomains = [
          "example-no-autolink.com",
          "another-no-autolink.com",
        ];

        return !disallowedDomains.includes(parsedUrl.hostname);
      } catch {
        return false;
      }
    },
  }),
];
