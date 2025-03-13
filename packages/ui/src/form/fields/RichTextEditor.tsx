'use client'
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Level } from '@tiptap/extension-heading';
import { useEffect } from 'react';
import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaEraser,
} from 'react-icons/fa';
import CustomComponent from "./CustomComponent";
import { ZodTypeAny } from "zod";

interface RichTextEditorProps {
  label: string;
  name: string;
  value: string;
  onChange: (content: string) => void;
  error?: string;
  fieldSchema: ZodTypeAny;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ label, name, value, onChange, error, fieldSchema }: RichTextEditorProps) => {

// export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ code: false, codeBlock: false })],
    immediatelyRender: false,
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-base prose-p:mb-2 prose-p:mt-0  prose-p:leading-tight prose-headings:font-semibold \
        prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg \
        prose-headings:mb-1 prose-headings:mt-4 prose-h4:mb-0\
        max-w-none border border-gray-300 p-2 min-h-[150px] focus:outline-none \
        border-none `,
      },
    },
    onUpdate({ editor }) {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
      <div className="border rounded-md overflow-hidden border-gray-300">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      </div>
    </CustomComponent>
  );
}

interface MenuBarProps {
  editor: Editor;
}

const headingLevels: Level[] = [1, 2, 3, 4];

const MenuBar = ({ editor }: MenuBarProps) => (
  <div className="flex flex-wrap gap-1 border-b bg-gray-50 p-1 border-gray-300">

    {/* Heading Dropdown */}
    <select
      className="border border-gray-300 rounded p-1 bg-white"
      value={headingLevels.find((level) => editor.isActive('heading', { level })) || ''}
      onChange={(e) => {
        const level = Number(e.target.value) as Level;
        if (level) editor.chain().focus().toggleHeading({ level }).run();
      }}
    >
      <option value="">Paragraph</option>
      {headingLevels.map((level) => (
        <option key={level} value={level}>
          Heading {level}
        </option>
      ))}
    </select>
    
    {/* Bold */}
    <button
      type="button"
      aria-label="Bold"
      title="Bold"
      onClick={() => editor.chain().focus().toggleBold().run()}
      className={`p-2 rounded ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
    >
      <FaBold />
    </button>

    {/* Italic */}
    <button
      type="button"
      aria-label="Italic"
      title="Italic"
      onClick={() => editor.chain().focus().toggleItalic().run()}
      className={`p-2 rounded ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
    >
      <FaItalic />
    </button>

    {/* Strikethrough */}
    <button
      type="button"
      aria-label="Strikethrough"
      title="Strikethrough"
      onClick={() => editor.chain().focus().toggleStrike().run()}
      className={`p-2 rounded ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
    >
      <FaStrikethrough />
    </button>

    

    {/* Bullet List */}
    <button
      type="button"
      aria-label="Bullet List"
      title="Bullet List"
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
    >
      <FaListUl />
    </button>

    {/* Ordered List */}
    <button
      type="button"
      aria-label="Ordered List"
      title="Ordered List"
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
    >
      <FaListOl />
    </button>

    {/* Blockquote */}
    <button
      type="button"
      aria-label="Quote"
      title="Quote"
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
      className={`p-2 rounded ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
    >
      <FaQuoteRight />
    </button>

    {/* Clear Formatting */}
    <button
      type="button"
      aria-label="Clear Formatting"
      title="Clear Formatting"
      onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      className="p-2 rounded"
    >
      <FaEraser />
    </button>
  </div>
);

export default RichTextEditor