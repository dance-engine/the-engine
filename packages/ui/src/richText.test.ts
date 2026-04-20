import { describe, expect, it } from "vitest";
import {
  RICH_TEXT_ALLOWED_MARK_TYPES,
  RICH_TEXT_ALLOWED_NODE_TYPES,
  richTextEditorExtensions,
  richTextRenderExtensions,
} from "./richText";

describe("richText contract", () => {
  it("keeps the canonical node and mark allowlists", () => {
    expect(RICH_TEXT_ALLOWED_NODE_TYPES).toEqual([
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
    ]);

    expect(RICH_TEXT_ALLOWED_MARK_TYPES).toEqual([
      "bold",
      "strike",
      "italic",
      "underline",
      "highlight",
      "link",
    ]);
  });

  it("keeps renderer and editor extensions aligned for display support", () => {
    const renderNames = [...new Set(richTextRenderExtensions.map((extension) => extension.name))]
      .sort();
    const editorNames = [...new Set(richTextEditorExtensions.map((extension) => extension.name))]
      .sort();

    expect(editorNames).toEqual(renderNames);
  });
});
