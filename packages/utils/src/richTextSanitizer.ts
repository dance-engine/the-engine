export type RichTextMarkRaw = {
  type?: unknown;
  attrs?: Record<string, unknown>;
};

export type RichTextNodeRaw = {
  type?: unknown;
  text?: unknown;
  attrs?: Record<string, unknown>;
  marks?: RichTextMarkRaw[];
  content?: RichTextNodeRaw[];
};

export type SanitizedRichTextMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type SanitizedRichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: SanitizedRichTextMark[];
  content?: SanitizedRichTextNode[];
};

export type SanitizedRichTextDocument = {
  type: "doc";
  content: SanitizedRichTextNode[];
};

export type RichTextSanitizerOptions = {
  allowedNodeTypes: readonly string[];
  allowedMarkTypes: readonly string[];
  inlineParentTypes?: readonly string[];
  unsupportedBlockType?: string;
};

const sanitizeLinkAttrs = (attrs?: Record<string, unknown>) => {
  if (!attrs) {
    return undefined;
  }

  const href = typeof attrs.href === "string" ? attrs.href : undefined;
  if (!href) {
    return undefined;
  }

  return {
    href,
    target: typeof attrs.target === "string" ? attrs.target : null,
    rel: typeof attrs.rel === "string" ? attrs.rel : null,
    class: typeof attrs.class === "string" ? attrs.class : null,
  };
};

const extractPlainText = (node: RichTextNodeRaw): string => {
  const fragments: string[] = [];

  if (typeof node.text === "string") {
    fragments.push(node.text);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const childText = extractPlainText(child);
      if (childText) {
        fragments.push(childText);
      }
    }
  }

  return fragments.join(" ").trim();
};

const sanitizeMarks = (
  marks: RichTextMarkRaw[] | undefined,
  allowedMarkTypes: Set<string>,
): SanitizedRichTextMark[] | undefined => {
  if (!Array.isArray(marks)) {
    return undefined;
  }

  const sanitized = marks
    .map((mark) => {
      const markType = typeof mark?.type === "string" ? mark.type : undefined;
      if (!markType || !allowedMarkTypes.has(markType)) {
        return null;
      }

      if (markType === "link") {
        return {
          type: markType,
          attrs: sanitizeLinkAttrs(mark.attrs),
        };
      }

      return { type: markType };
    })
    .filter(Boolean);

  return sanitized.length > 0
    ? (sanitized as SanitizedRichTextMark[])
    : undefined;
};

const sanitizeNode = (
  node: RichTextNodeRaw,
  options: {
    allowedNodeTypes: Set<string>;
    allowedMarkTypes: Set<string>;
    inlineParentTypes: Set<string>;
    unsupportedBlockType?: string;
  },
  parentType?: string,
): SanitizedRichTextNode[] => {
  const nodeType = typeof node?.type === "string" ? node.type : undefined;
  const sanitizedContent = Array.isArray(node?.content)
    ? node.content.flatMap((child) => sanitizeNode(child, options, nodeType))
    : undefined;

  if (!nodeType || !options.allowedNodeTypes.has(nodeType)) {
    const fallbackText = extractPlainText(node);

    if (parentType && options.inlineParentTypes.has(parentType)) {
      return fallbackText ? [{ type: "text", text: fallbackText }] : [];
    }

    if (fallbackText && options.unsupportedBlockType) {
      return [
        {
          type: options.unsupportedBlockType,
          attrs: { originalType: nodeType || "unknown" },
          content: [{ type: "text", text: fallbackText }],
        },
      ];
    }

    if (fallbackText) {
      return [
        {
          type: "paragraph",
          content: [{ type: "text", text: fallbackText }],
        },
      ];
    }

    return sanitizedContent || [];
  }

  if (nodeType === "text") {
    const text = typeof node.text === "string" ? node.text : "";
    if (!text) {
      return [];
    }

    return [
      {
        type: "text",
        text,
        marks: sanitizeMarks(node.marks, options.allowedMarkTypes),
      },
    ];
  }

  const sanitizedNode: SanitizedRichTextNode = {
    type: nodeType,
  };

  if (nodeType === "heading") {
    const level =
      typeof node.attrs?.level === "number" &&
      node.attrs.level >= 1 &&
      node.attrs.level <= 6
        ? node.attrs.level
        : 2;
    sanitizedNode.attrs = { level };
  }

  if (sanitizedContent && sanitizedContent.length > 0) {
    sanitizedNode.content = sanitizedContent;
  }

  if (nodeType === "doc" && !sanitizedNode.content?.length) {
    sanitizedNode.content = [{ type: "paragraph", content: [] }];
  }

  return [sanitizedNode];
};

export const sanitizeRichTextDocument = (
  node: RichTextNodeRaw,
  options: RichTextSanitizerOptions,
): SanitizedRichTextDocument => {
  const [rootNode] = sanitizeNode(
    node,
    {
      allowedNodeTypes: new Set(options.allowedNodeTypes),
      allowedMarkTypes: new Set(options.allowedMarkTypes),
      inlineParentTypes: new Set(options.inlineParentTypes || ["paragraph", "heading"]),
      unsupportedBlockType: options.unsupportedBlockType,
    },
    undefined,
  );

  return rootNode?.type === "doc"
    ? (rootNode as SanitizedRichTextDocument)
    : { type: "doc", content: [] };
};

export const parseAndSanitizeRichTextDocument = (
  input: string | undefined,
  options: RichTextSanitizerOptions,
): SanitizedRichTextDocument | undefined => {
  if (!input) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(input) as RichTextNodeRaw;
    return sanitizeRichTextDocument(parsed, options);
  } catch {
    return undefined;
  }
};
