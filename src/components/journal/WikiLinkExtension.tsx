"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

// ────────────────────────────────────────────────────────────
//  WikiLink TipTap Node Extension
//  Syntax: [[Note Title]] → stored as inline node with attrs
//  { title, noteId? }
// ────────────────────────────────────────────────────────────

interface WikiLinkAttrs {
    title: string;
    noteId: string | null;
}

// ── React node view ─────────────────────────────────────────
// Use a ref-based callback so navigation always sees fresh notes/handler
// even when extension was created with an earlier snapshot.
export type WikiLinkNavigateFn = (id: string) => void;

function WikiLinkView({
    node,
    notes,
    navigateRef,
}: {
    node: ProseMirrorNode;
    notes: { id: string; title: string }[];
    navigateRef: { current: WikiLinkNavigateFn | null };
}) {
    const { title, noteId } = node.attrs as WikiLinkAttrs;
    const exists = notes.some((n) => n.id === noteId || n.title === title);

    return (
        <NodeViewWrapper as="span" className="inline">
            <button
                type="button"
                onClick={() => {
                    const target = notes.find((n) => n.id === noteId || n.title === title);
                    if (target) navigateRef.current?.(target.id);
                }}
                className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-sm font-medium transition-colors ${exists
                    ? "bg-sage/15 text-sage hover:bg-sage/25 cursor-pointer"
                    : "border border-dashed border-charcoal/25 text-charcoal/40 hover:border-charcoal/40 cursor-pointer"
                    }`}
            >
                <span className="text-[10px]">⟦</span>
                {title}
                <span className="text-[10px]">⟧</span>
            </button>
        </NodeViewWrapper>
    );
}

// ── Factory ─────────────────────────────────────────────────
// navigateRef: a stable React ref so the node view always has the latest handler
// onSuggestionUpdate: called by the Suggestion plugin when the popup should open/close
export function createWikiLinkExtension(
    notes: { id: string; title: string }[],
    navigateRef: { current: WikiLinkNavigateFn | null },
    suggestionOptions: Partial<SuggestionOptions>,
) {
    return Node.create({
        name: "wikiLink",
        group: "inline",
        inline: true,
        atom: true,
        selectable: true,
        draggable: false,

        addAttributes() {
            return {
                title: { default: "" },
                noteId: { default: null },
            };
        },

        parseHTML() {
            return [{ tag: "span[data-wiki-link]" }];
        },

        renderHTML({ HTMLAttributes }) {
            return [
                "span",
                mergeAttributes(HTMLAttributes, { "data-wiki-link": "" }),
                `[[${HTMLAttributes.title}]]`,
            ];
        },

        addNodeView() {
            return ReactNodeViewRenderer(
                ({ node }: { node: ProseMirrorNode }) => (
                    <WikiLinkView node={node} notes={notes} navigateRef={navigateRef} />
                ),
            );
        },

        addProseMirrorPlugins() {
            return [
                Suggestion({
                    editor: this.editor,
                    char: "[[",
                    allowSpaces: true,
                    // Match everything after [[ up until ]] or end of input
                    // The query is the text between [[ and cursor.
                    pluginKey: undefined,
                    command: ({ editor, range, props }) => {
                        // Delete the "[[query" text and insert a wikiLink node
                        const noteItem = props as { id: string; title: string };
                        editor
                            .chain()
                            .focus()
                            .deleteRange(range)
                            .insertContent({
                                type: "wikiLink",
                                attrs: { title: noteItem.title, noteId: noteItem.id },
                            })
                            .run();
                    },
                    items: ({ query }: { query: string }) => {
                        if (!query && notes.length <= 10) return notes;
                        return notes.filter((n) =>
                            n.title.toLowerCase().includes(query.toLowerCase()),
                        );
                    },
                    ...suggestionOptions,
                }),
            ];
        },
    });
}

/** Insert a wikiLink node programmatically (used by input-rule fallback) */
export function insertWikiLink(
    editor: any,
    range: { from: number; to: number },
    note: { id: string; title: string },
) {
    editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "wikiLink", attrs: { title: note.title, noteId: note.id } })
        .run();
}

/** Parse the TipTap doc JSON and return all wikiLink noteIds referenced. */
export function extractWikiLinkIds(
    doc: { type: string; content?: any[] } | null | undefined,
): string[] {
    if (!doc) return [];
    const ids: string[] = [];

    function walk(node: { type: string; attrs?: Record<string, any>; content?: any[] }) {
        if (node.type === "wikiLink" && node.attrs?.noteId) {
            ids.push(node.attrs.noteId as string);
        }
        if (node.content) {
            for (const child of node.content) walk(child);
        }
    }

    walk(doc);
    return [...new Set(ids)];
}
