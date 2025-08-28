'use client'
import { RichTextEditorProps } from "../../types/form"
import { useEditor, EditorContent, Editor, useEditorState} from '@tiptap/react';
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit';
import { Level } from '@tiptap/extension-heading';
import { useEffect, useCallback } from 'react';
import { FaBold, FaItalic, FaStrikethrough, FaListUl, FaListOl, FaQuoteRight,FaEraser, FaLink } from 'react-icons/fa';
import CustomComponent from "./CustomComponent";

const RichTextEditor: React.FC<RichTextEditorProps> = ({ label, name, value, onChange, error, fieldSchema }: RichTextEditorProps) => {

// export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
        isAllowedUri: (url:string, ctx:{defaultProtocol:string, protocols:(string | {scheme:string})[], defaultValidate:(url:string) => boolean}) => {
          try {
            // construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`)

            // use default validation
            if (!ctx.defaultValidate(parsedUrl.href)) {
              return false
            }

            // disallowed protocols
            const disallowedProtocols = ['ftp', 'file', 'mailto']
            const protocol = parsedUrl.protocol.replace(':', '')

            if (disallowedProtocols.includes(protocol)) {
              return false
            }

            // only allow protocols specified in ctx.protocols
            const allowedProtocols = ctx.protocols.map(p => (typeof p === 'string' ? p : p.scheme))

            if (!allowedProtocols.includes(protocol)) {
              return false
            }

            // disallowed domains
            const disallowedDomains = ['example-phishing.com', 'malicious-site.net']
            const domain = parsedUrl.hostname

            if (disallowedDomains.includes(domain)) {
              return false
            }

            // all checks have passed
            return true
          } catch {
            return false
          }
        },
        shouldAutoLink: (url:string) => {
          try {
            // construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`)

            // only auto-link if the domain is not in the disallowed list
            const disallowedDomains = ['example-no-autolink.com', 'another-no-autolink.com']
            const domain = parsedUrl.hostname

            return !disallowedDomains.includes(domain)
          } catch {
            return false
          }
        },
      }),
    ],
    immediatelyRender: false,
    content: value ? JSON.parse(value) : value,
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
    
    const newValue = value ? JSON.parse(value) : {}
    if (editor && JSON.stringify(editor.getJSON()) != JSON.stringify(newValue)) {
      editor.commands.setContent(newValue);
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
const bgColorClasses = 'bg-gray-200 dark:bg-gray-100/20'
const MenuBar = ({ editor }: MenuBarProps) => { 

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()

      return
    }

    // update link
    try {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } catch (e) {
      alert(e.message)
    }
  }, [editor])

  const editorState = useEditorState({
    editor,
    selector: ctx => ({
      isLink: ctx.editor.isActive('link'),
    }),
  })

  if (!editor) {
    return null
  }

  return (<div className="flex flex-wrap gap-1 border-b bg-black/2 dark:bg-white/5  p-1 border-gray-300">

    {/* Heading Dropdown */}
    <select
      className="border border-gray-300 rounded py-1 pl-2 pr-4 "
      value={headingLevels.find((level) => editor.isActive('heading', { level })) || ''}
      aria-label="Heading Level"
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
      className={`p-2 rounded ${editor.isActive('bold') ? bgColorClasses : ''}`}
    >
      <FaBold />
    </button>

    {/* Italic */}
    <button
      type="button"
      aria-label="Italic"
      title="Italic"
      onClick={() => editor.chain().focus().toggleItalic().run()}
      className={`p-2 rounded ${editor.isActive('italic') ? bgColorClasses : ''}`}
    >
      <FaItalic />
    </button>

    {/* Strikethrough */}
    <button
      type="button"
      aria-label="Strikethrough"
      title="Strikethrough"
      onClick={() => editor.chain().focus().toggleStrike().run()}
      className={`p-2 rounded ${editor.isActive('strike') ? bgColorClasses : ''}`}
    >
      <FaStrikethrough />
    </button>

    

    {/* Bullet List */}
    <button
      type="button"
      aria-label="Bullet List"
      title="Bullet List"
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      className={`p-2 rounded ${editor.isActive('bulletList') ? bgColorClasses : ''}`}
    >
      <FaListUl />
    </button>

    {/* Ordered List */}
    <button
      type="button"
      aria-label="Ordered List"
      title="Ordered List"
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      className={`p-2 rounded ${editor.isActive('orderedList') ? bgColorClasses : ''}`}
    >
      <FaListOl />
    </button>

    {/* Blockquote */}
    <button
      type="button"
      aria-label="Quote"
      title="Quote"
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
      className={`p-2 rounded ${editor.isActive('blockquote') ? bgColorClasses : ''}`}
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

    {/* Link */}
    <button
      type="button"
      aria-label="Link"
      title="Link"
      onClick={() => editor.chain().focus().toggleLink().run()}
      className={`p-2 rounded ${editor.isActive('link') ? bgColorClasses : ''}`}
    >
      <FaLink />
    </button>

    <button onClick={setLink} className={editorState.isLink ? 'is-active' : ''}>
            Set link
          </button>
          <button onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editorState.isLink}>
            Unset link
          </button>
  </div>
  );
}

export default RichTextEditor