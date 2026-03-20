import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, label, error, className = '' }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync external value changes (e.g. react-hook-form reset())
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = current === '<p></p>' ? '' : current;
    if (normalized !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  const toolbarBtn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className={`border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300'}`}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={toolbarBtn(!!editor?.isActive('bold'))}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={toolbarBtn(!!editor?.isActive('italic'))}
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={toolbarBtn(!!editor?.isActive('bulletList'))}
            title="Bullet list"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={toolbarBtn(!!editor?.isActive('orderedList'))}
            title="Ordered list"
          >
            <ListOrdered size={14} />
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
