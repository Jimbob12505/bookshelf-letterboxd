"use client";

import type { Editor } from "@tiptap/react";

interface ToolbarProps {
    editor: Editor | null;
    onInsertCanvas: () => void;
}

type ToolDef =
    | { type: "button"; label: string; icon: string; action: (e: Editor) => void; isActive: (e: Editor) => boolean }
    | { type: "sep" };

const tools: ToolDef[] = [
    {
        type: "button",
        label: "Bold",
        icon: "B",
        action: (e) => e.chain().focus().toggleBold().run(),
        isActive: (e) => e.isActive("bold"),
    },
    {
        type: "button",
        label: "Italic",
        icon: "I",
        action: (e) => e.chain().focus().toggleItalic().run(),
        isActive: (e) => e.isActive("italic"),
    },
    {
        type: "button",
        label: "Strikethrough",
        icon: "S̶",
        action: (e) => e.chain().focus().toggleStrike().run(),
        isActive: (e) => e.isActive("strike"),
    },
    { type: "sep" },
    {
        type: "button",
        label: "Heading 1",
        icon: "H1",
        action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: (e) => e.isActive("heading", { level: 1 }),
    },
    {
        type: "button",
        label: "Heading 2",
        icon: "H2",
        action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: (e) => e.isActive("heading", { level: 2 }),
    },
    {
        type: "button",
        label: "Heading 3",
        icon: "H3",
        action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: (e) => e.isActive("heading", { level: 3 }),
    },
    { type: "sep" },
    {
        type: "button",
        label: "Bullet List",
        icon: "≡",
        action: (e) => e.chain().focus().toggleBulletList().run(),
        isActive: (e) => e.isActive("bulletList"),
    },
    {
        type: "button",
        label: "Ordered List",
        icon: "1.",
        action: (e) => e.chain().focus().toggleOrderedList().run(),
        isActive: (e) => e.isActive("orderedList"),
    },
    {
        type: "button",
        label: "Blockquote",
        icon: "❝",
        action: (e) => e.chain().focus().toggleBlockquote().run(),
        isActive: (e) => e.isActive("blockquote"),
    },
    {
        type: "button",
        label: "Code Block",
        icon: "</>",
        action: (e) => e.chain().focus().toggleCodeBlock().run(),
        isActive: (e) => e.isActive("codeBlock"),
    },
    { type: "sep" },
    {
        type: "button",
        label: "Horizontal Rule",
        icon: "—",
        action: (e) => e.chain().focus().setHorizontalRule().run(),
        isActive: () => false,
    },
];

export function EditorToolbar({ editor, onInsertCanvas }: ToolbarProps) {
    if (!editor) return null;

    return (
        <div className="flex items-center gap-0.5 rounded-xl border border-charcoal/8 bg-white/60 p-1.5 backdrop-blur-sm flex-wrap">
            {tools.map((tool, i) => {
                if (tool.type === "sep") {
                    return <div key={i} className="mx-1 h-5 w-px bg-charcoal/10" />;
                }
                const active = tool.isActive(editor);
                return (
                    <button
                        key={tool.label}
                        title={tool.label}
                        onMouseDown={(ev) => {
                            ev.preventDefault(); // keep editor focus
                            tool.action(editor);
                        }}
                        className={`min-w-[30px] rounded-lg px-2 py-1 text-xs font-bold tabular-nums transition-all ${active
                                ? "bg-sage/20 text-sage"
                                : "text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal"
                            }`}
                    >
                        {tool.icon}
                    </button>
                );
            })}

            {/* Separator before canvas */}
            <div className="mx-1 h-5 w-px bg-charcoal/10" />

            {/* Canvas insert button */}
            <button
                title="Insert Drawing Canvas"
                onMouseDown={(ev) => {
                    ev.preventDefault();
                    onInsertCanvas();
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal transition-all"
            >
                <span>🎨</span>
                <span>Canvas</span>
            </button>
        </div>
    );
}
