import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PlainOrRichTextValue } from "@/lib/sanity/content";

type Props = {
  value?: PlainOrRichTextValue;
  // Classes for the text: put on the <p> for plain text, or on the wrapper <div> for rich text.
  className?: string;
  // Optional Portable Text overrides, e.g. to wrap each paragraph's text in a highlight span.
  components?: PortableTextComponents;
};

// Renders a Sanity field that is plain text today but may become rich text (blockContent) later.
// Plain text: one <p>, keeping line breaks. Rich text: paragraphs, lists and links, spaced apart,
// with links underlined so they stand out from the text around them.
// Renders nothing when the field is empty.
export default function PlainOrRichText({ value, className = "", components }: Props) {
  if (!value) return null;

  if (typeof value === "string") {
    if (!value.trim()) return null;
    return <p className={`whitespace-pre-line ${className}`}>{value}</p>;
  }

  if (value.length === 0) return null;
  return (
    <div
      className={`[&>*+*]:mt-3 [&_a]:underline [&_a]:underline-offset-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 ${className}`}
    >
      <PortableText value={value} components={components} />
    </div>
  );
}
