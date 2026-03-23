"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";

const MERGE_TAGS = [
  { label: "שם פרטי", tag: "{{firstName}}" },
  { label: "שם משפחה", tag: "{{lastName}}" },
  { label: "עיר", tag: "{{city}}" },
  { label: "תחום", tag: "{{sectors}}" },
];

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const [showMergeTags, setShowMergeTags] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none",
        dir: "rtl",
      },
    },
  });

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
    className: extraClass,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    className?: string;
  }) => (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className={`h-8 p-0 ${extraClass || "w-8"}`}
    >
      {children}
    </Button>
  );

  const addLink = () => {
    const url = window.prompt("הכנס קישור:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const insertMergeTag = (tag: string) => {
    editor.chain().focus().insertContent(tag).run();
    setShowMergeTags(false);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 items-center bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <u>U</u>
        </ToolbarButton>
        <div className="w-px bg-border mx-1 h-6" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>
        <div className="w-px bg-border mx-1 h-6" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          &bull;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1.
        </ToolbarButton>
        <div className="w-px bg-border mx-1 h-6" />
        <ToolbarButton onClick={addLink} active={editor.isActive("link")}>
          🔗
        </ToolbarButton>
        <div className="w-px bg-border mx-1 h-6" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
        >
          ⇒
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
        >
          ⇔
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
        >
          ⇐
        </ToolbarButton>
        <div className="w-px bg-border mx-1 h-6" />
        {/* Merge Tags */}
        <div className="relative">
          <Button
            type="button"
            variant={showMergeTags ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMergeTags(!showMergeTags)}
            className="h-8 px-2 text-xs"
          >
            + שם נמען
          </Button>
          {showMergeTags && (
            <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[160px]">
              {MERGE_TAGS.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertMergeTag(item.tag)}
                  className="block w-full text-right px-3 py-2 text-sm hover:bg-muted/50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground mr-2 text-xs">{item.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
