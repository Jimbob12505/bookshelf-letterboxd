"use client";

import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { createNote, updateNote, deleteNote, updateNoteLinks } from "~/server/actions";
import { DrawingCanvas } from "./DrawingCanvas";
import { EditorToolbar } from "./EditorToolbar";
import { createWikiLinkExtension, extractWikiLinkIds } from "./WikiLinkExtension";
import type { WikiLinkNavigateFn } from "./WikiLinkExtension";
import type { SuggestionProps } from "@tiptap/suggestion";
import { GraphView } from "./GraphView";

type Note = {
  id: string;
  title: string;
  content: any;
  tags: string[];
  createdAt: Date;
  linksTo?: { id: string }[];
};

type Book = {
  id: string;
  title: string;
  thumbnail: string | null;
  authors: string[];
};

// ── Suggestion dropdown state ────────────────────────────────
interface SuggestionState {
  items: { id: string; title: string }[];
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
  command: ((item: { id: string; title: string }) => void) | null;
}

export function JournalEditor({ book, initialNotes }: { book: Book; initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialNotes[0]?.id || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref so the Drawing node can trigger a save without recreating the editor.
  const forceSaveRef = useRef<(() => void) | null>(null);

  // Stable navigate ref — always points to latest setActiveNoteId so node views
  // never have a stale closure regardless of when the extension was created.
  const navigateRef = useRef<WikiLinkNavigateFn | null>(null);
  useEffect(() => {
    navigateRef.current = (id: string) => setActiveNoteId(id);
  }, []);

  // Build the Drawing node inside the component so it can close over forceSaveRef.
  const Drawing = useMemo(() => Node.create({
    name: 'drawing',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
      return {
        data: {
          default: null,
          parseHTML: (element: Element) => element.getAttribute('data-canvas-data'),
          renderHTML: (attributes: Record<string, unknown>) => ({
            'data-canvas-data': attributes.data,
          }),
        }
      };
    },
    parseHTML() { return [{ tag: 'div[data-type="drawing"]' }]; },
    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
      return ['div', mergeAttributes(HTMLAttributes as Record<string, string>, { 'data-type': 'drawing' })];
    },
    addNodeView() {
      return ReactNodeViewRenderer(({ node, updateAttributes }: any) => (
        <NodeViewWrapper>
          <DrawingCanvas
            initialData={node.attrs.data}
            onSave={(data: string) => {
              updateAttributes({ data });
              forceSaveRef.current?.();
            }}
          />
        </NodeViewWrapper>
      ));
    }
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeNote = notes.find((n) => n.id === activeNoteId);

  // WikiLink extension — rebuilt whenever notes list changes so autocomplete items are fresh.
  // navigateRef stays stable so node-view clicks always work.
  const WikiLink = useMemo(
    () => createWikiLinkExtension(
      notes.map((n) => ({ id: n.id, title: n.title })),
      navigateRef,
      {
        // Called by the Suggestion plugin to open / update / close the popup
        render: () => {
          let currentProps: SuggestionProps<{ id: string; title: string }>;

          return {
            onStart: (props: SuggestionProps<{ id: string; title: string }>) => {
              currentProps = props;
              setSuggestion({
                items: props.items as { id: string; title: string }[],
                selectedIndex: 0,
                clientRect: props.clientRect ?? null,
                command: (item) => props.command({ id: item.id, title: item.title }),
              });
            },
            onUpdate: (props: SuggestionProps<{ id: string; title: string }>) => {
              currentProps = props;
              setSuggestion((prev) => ({
                items: props.items as { id: string; title: string }[],
                selectedIndex: 0,
                clientRect: props.clientRect ?? null,
                command: (item) => props.command({ id: item.id, title: item.title }),
              }));
            },
            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
              if (event.key === "Escape") {
                setSuggestion(null);
                return true;
              }
              if (event.key === "ArrowDown") {
                setSuggestion((prev) =>
                  prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % prev.items.length } : prev
                );
                return true;
              }
              if (event.key === "ArrowUp") {
                setSuggestion((prev) =>
                  prev
                    ? { ...prev, selectedIndex: (prev.selectedIndex - 1 + prev.items.length) % prev.items.length }
                    : prev
                );
                return true;
              }
              if (event.key === "Enter") {
                setSuggestion((prev) => {
                  if (prev && prev.items[prev.selectedIndex]) {
                    prev.command?.(prev.items[prev.selectedIndex]!);
                    return null;
                  }
                  return prev;
                });
                return true;
              }
              return false;
            },
            onExit: () => {
              setSuggestion(null);
            },
          };
        },
      },
    ),
    [notes], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Drawing,
      WikiLink,
      Placeholder.configure({
        placeholder: "Start your reflection… type [[Note]] to link notes",
      }),
    ],
    content: activeNote?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-stone prose-lg focus:outline-none max-w-full font-serif leading-relaxed min-h-[500px]",
      },
    },
  });

  // --- Robust Auto-save Logic ---
  const performSave = useCallback(async (id: string, content: any) => {
    setSaving(true);
    try {
      const plainContent = JSON.parse(JSON.stringify(content));
      await updateNote(id, { content: plainContent });
      setLastSaved(new Date());
      const linkedIds = extractWikiLinkIds(plainContent);
      setNotes((prev: Note[]) => prev.map((n: Note) => n.id === id ? { ...n, content: plainContent, linksTo: linkedIds.map((lid) => ({ id: lid })) } : n));

      // Debounced wiki-link sync (fire-and-forget; don't block save)
      if (linkSaveTimeoutRef.current) clearTimeout(linkSaveTimeoutRef.current);
      linkSaveTimeoutRef.current = setTimeout(() => {
        updateNoteLinks(id, linkedIds).catch(console.error);
      }, 2000);
    } catch (e) {
      console.error("Auto-save failed:", e);
    } finally {
      setTimeout(() => setSaving(false), 800);
    }
  }, []);

  // Keep forceSaveRef up-to-date so the Drawing node can trigger an immediate save.
  useEffect(() => {
    if (!editor || !activeNoteId) {
      forceSaveRef.current = null;
      return;
    }
    forceSaveRef.current = () => {
      const content = editor.getJSON();
      performSave(activeNoteId, content);
    };
  }, [editor, activeNoteId, performSave]);

  // Debounce save on editor updates
  useEffect(() => {
    if (!editor || !activeNoteId) return;

    const handleUpdate = () => {
      const content = editor.getJSON();
      const text = editor.getText();

      setShowCommands(text.endsWith('/'));

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        performSave(activeNoteId, content);
      }, 1500);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, activeNoteId, performSave]);

  // Switch notes — defer setContent to avoid flushSync-inside-useEffect
  useEffect(() => {
    if (editor && activeNote) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(activeNote.content);
      if (currentContent !== newContent) {
        setTimeout(() => {
          editor.commands.setContent(activeNote.content || "");
        }, 0);
      }
      setShowCommands(false);
    }
  }, [activeNoteId, editor]);

  // --- Create note ---
  const handleCreateNote = async () => {
    setSaving(true);
    try {
      const newNote = await createNote(book.id);
      const typedNote = {
        ...newNote,
        createdAt: new Date(newNote.createdAt),
        linksTo: [],
      } as Note;
      setNotes([typedNote, ...notes]);
      setActiveNoteId(newNote.id);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // --- Delete note ---
  const handleDeleteNote = async (noteId: string) => {
    if (notes.length <= 1) return; // keep at least one note
    setDeletingId(noteId);
    try {
      await deleteNote(noteId);
      const remaining = notes.filter((n) => n.id !== noteId);
      setNotes(remaining);
      if (activeNoteId === noteId) {
        setActiveNoteId(remaining[0]?.id ?? null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Title change ---
  const handleTitleChange = async (newTitle: string) => {
    if (!activeNoteId) return;
    setNotes(notes.map((n) => n.id === activeNoteId ? { ...n, title: newTitle } : n));
    await updateNote(activeNoteId, { title: newTitle });
  };

  // --- Insert canvas from toolbar ---
  const handleInsertCanvas = () => {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'drawing' }).run();
  };

  // Graph-ready notes list (includes linksTo from state)
  const graphNotes = notes.map((n) => ({
    id: n.id,
    title: n.title,
    linksTo: n.linksTo ?? [],
  }));

  // ── Suggestion popup position ────────────────────────────────
  const suggestionRect = suggestion?.clientRect?.();
  const suggestionTop = suggestionRect ? suggestionRect.bottom + window.scrollY + 6 : 0;
  const suggestionLeft = suggestionRect ? suggestionRect.left + window.scrollX : 0;

  return (
    <div className="fixed inset-0 top-24 flex overflow-hidden bg-parchment">
      {/* Graph View Modal */}
      <AnimatePresence>
        {showGraph && (
          <GraphView
            notes={graphNotes}
            activeNoteId={activeNoteId}
            onSelectNote={(id) => setActiveNoteId(id)}
            onClose={() => setShowGraph(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Wiki-Link Suggestion Popup ──────────────────────────── */}
      <AnimatePresence>
        {suggestion && suggestion.items.length > 0 && (
          <motion.div
            key="wiki-suggestion"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "fixed",
              top: suggestionTop,
              left: suggestionLeft,
              zIndex: 9999,
            }}
            className="w-64 overflow-hidden rounded-2xl border border-charcoal/8 bg-white/95 shadow-2xl backdrop-blur-md"
          >
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-charcoal/35 border-b border-charcoal/5">
              Link note
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {suggestion.items.map((item, idx) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      suggestion.command?.(item);
                      setSuggestion(null);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium transition-colors ${idx === suggestion.selectedIndex
                      ? "bg-sage/10 text-sage"
                      : "text-charcoal/70 hover:bg-charcoal/5"
                      }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-50">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="truncate">{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brain Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0 }}
        className="relative flex-shrink-0 overflow-hidden border-r border-charcoal/5 bg-white/30 backdrop-blur-sm"
      >
        <div className="flex h-full w-[320px] flex-col p-6">
          {/* Book info */}
          <div className="mb-8 flex items-center gap-4 rounded-2xl bg-charcoal/5 p-3">
            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md shadow-md">
              {book.thumbnail && (
                <Image src={book.thumbnail} alt={book.title} fill className="object-cover" />
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="truncate font-serif text-sm font-bold text-charcoal">{book.title}</h4>
              <p className="truncate text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">
                {book.authors[0]}
              </p>
            </div>
          </div>

          {/* Notes header */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-charcoal/40">
              Your Brain
            </h3>
            <button
              onClick={handleCreateNote}
              className="text-sage hover:bg-sage/10 rounded-lg p-1 transition-colors"
              title="New note"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Note list */}
          <div className="flex-grow space-y-1 overflow-y-auto no-scrollbar pb-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 transition-all ${activeNoteId === note.id
                  ? "bg-sage/10 text-sage"
                  : "text-charcoal/60 hover:bg-charcoal/5"
                  }`}
              >
                <button
                  onClick={() => setActiveNoteId(note.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="truncate text-sm font-medium">{note.title}</span>
                </button>

                {/* Delete button — shown on hover, disabled if only note */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  disabled={notes.length <= 1 || deletingId === note.id}
                  title={notes.length <= 1 ? "Can't delete the only note" : "Delete note"}
                  className={`flex-shrink-0 rounded-lg p-1 opacity-0 transition-all group-hover:opacity-100 ${notes.length <= 1
                    ? "cursor-not-allowed text-charcoal/20"
                    : "text-charcoal/30 hover:bg-red-50 hover:text-red-400"
                    }`}
                >
                  {deletingId === note.id ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Graph view button */}
          <button
            onClick={() => setShowGraph(true)}
            className="mt-2 flex items-center justify-center gap-3 rounded-2xl bg-charcoal/5 border border-charcoal/10 p-4 transition-all hover:bg-sage/8 hover:border-sage/20 group"
          >
            <span className="text-lg">🕸️</span>
            <div className="text-left">
              <div className="text-xs font-bold text-charcoal/50 group-hover:text-sage transition-colors">
                Graph View
              </div>
              <div className="text-[10px] text-charcoal/30">
                {notes.length} notes
              </div>
            </div>
          </button>
        </div>
      </motion.aside>

      {/* Main Canvas */}
      <main className="relative flex-grow overflow-y-auto bg-parchment/50">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-charcoal/5 bg-parchment/80 px-8 py-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-charcoal/40 hover:text-charcoal transition-colors p-2 hover:bg-charcoal/5 rounded-xl"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
            <div className="h-4 w-px bg-charcoal/10" />
            <span className="text-[10px] text-charcoal/30 uppercase tracking-widest font-bold">
              {saving ? "Saving changes..." : lastSaved ? `Synced ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Ready"}
            </span>
          </div>

          <div className="rounded-full bg-sage/10 px-6 py-2 text-xs font-bold text-sage border border-sage/20">
            Garden Connected
          </div>
        </div>

        <div className="mx-auto max-w-3xl pt-12 pb-32 px-4 relative">
          {/* Title input */}
          <input
            type="text"
            value={activeNote?.title || ""}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-transparent font-serif text-5xl font-bold text-charcoal mb-6 focus:outline-none border-none placeholder:text-charcoal/10"
            placeholder="Untitled Reflection"
            disabled={!activeNoteId}
          />

          {/* Formatting Toolbar */}
          <div className="mb-6">
            <EditorToolbar editor={editor} onInsertCanvas={handleInsertCanvas} />
          </div>

          <EditorContent editor={editor} />

          {/* Slash Command shortcut (kept for discoverability) */}
          <AnimatePresence>
            {showCommands && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute left-4 top-[320px] w-64 rounded-2xl bg-white p-2 shadow-2xl border border-charcoal/5 z-50"
              >
                <div className="px-3 py-2 text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">Commands</div>
                <button
                  onClick={() => {
                    editor?.commands.deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from });
                    handleInsertCanvas();
                    setShowCommands(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-sage/10 rounded-xl transition-colors"
                >
                  <div className="bg-sage/20 p-2 rounded-lg text-sage">🎨</div>
                  <div className="text-left">
                    <div className="font-bold text-charcoal">Canvas</div>
                    <div className="text-xs text-charcoal/40 font-medium">Insert a sketching block</div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save toast */}
        <AnimatePresence>
          {saving && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 right-8 z-50"
            >
              <div className="rounded-full bg-white/80 backdrop-blur-md border border-charcoal/5 px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-charcoal/40 shadow-tactile">
                Persisting to Brain...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        /* Wiki link nodes should not show ProseMirror selection outline */
        .ProseMirror [data-wiki-link] { user-select: none; }
      `}</style>
    </div>
  );
}
