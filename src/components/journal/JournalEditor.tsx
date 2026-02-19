"use client";

import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { createNote, updateNote } from "~/server/actions";
import { DrawingCanvas } from "./DrawingCanvas";

type Note = {
  id: string;
  title: string;
  content: any;
  tags: string[];
  createdAt: Date;
};

type Book = {
  id: string;
  title: string;
  thumbnail: string | null;
  authors: string[];
};

export function JournalEditor({ book, initialNotes }: { book: Book; initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialNotes[0]?.id || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable ref so the Drawing node can call the latest save without
  // recreating the editor every time activeNoteId changes.
  const forceSaveRef = useRef<(() => void) | null>(null);

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
      return ReactNodeViewRenderer(({ node, updateAttributes }: { node: { attrs: { data: string } }, updateAttributes: (attrs: Record<string, unknown>) => void }) => (
        <NodeViewWrapper>
          <DrawingCanvas
            initialData={node.attrs.data}
            onSave={(data) => {
              // 1. Update the attribute in the TipTap node
              updateAttributes({ data });
              // 2. Force an immediate save — NodeView attribute updates
              //    do NOT fire editor's 'update' event, so the debounce
              //    never triggers. We call forceSaveRef directly instead.
              forceSaveRef.current?.();
            }}
          />
        </NodeViewWrapper>
      ));
    }
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Drawing,
      Placeholder.configure({
        placeholder: "Start your reflection or type '/' for commands...",
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
      // Deep-clone via JSON round-trip to strip any React "temporary client
      // reference" proxies that TipTap may retain from server-originated
      // initialNotes content. Without this, Prisma's serializer crashes with
      // "Cannot access toStringTag on the server" when it traverses the JSON.
      const plainContent = JSON.parse(JSON.stringify(content));
      await updateNote(id, { content: plainContent });
      setLastSaved(new Date());
      setNotes((prev: Note[]) => prev.map((n: Note) => n.id === id ? { ...n, content: plainContent } : n));
    } catch (e) {
      console.error("Auto-save failed:", e);
    } finally {
      setTimeout(() => setSaving(false), 800);
    }
  }, []);

  // Keep forceSaveRef up-to-date so the Drawing node can trigger an
  // immediate save without going through the 'update' event debounce
  // (NodeView attribute changes don't fire that event).
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

  useEffect(() => {
    if (!editor || !activeNoteId) return;

    const handleUpdate = () => {
      const content = editor.getJSON();
      const text = editor.getText();

      // Slash Command Detection
      setShowCommands(text.endsWith('/'));

      // Debounce Save
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

  // --- Switch notes ---
  useEffect(() => {
    if (editor && activeNote) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(activeNote.content);
      if (currentContent !== newContent) {
        // setContent() calls flushSync internally. React 18 forbids flushSync
        // inside useEffect, so defer to a macrotask to avoid the warning.
        setTimeout(() => {
          editor.commands.setContent(activeNote.content || "");
        }, 0);
      }
      setShowCommands(false);
    }
  }, [activeNoteId, editor]);

  const handleCreateNote = async () => {
    setSaving(true);
    try {
      const newNote = await createNote(book.id);
      const typedNote = {
        ...newNote,
        createdAt: new Date(newNote.createdAt)
      } as Note;
      setNotes([typedNote, ...notes]);
      setActiveNoteId(newNote.id);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!activeNoteId) return;
    setNotes(notes.map(n => n.id === activeNoteId ? { ...n, title: newTitle } : n));
    // Save title immediately
    await updateNote(activeNoteId, { title: newTitle });
  };

  return (
    <div className="fixed inset-0 top-24 flex overflow-hidden bg-parchment">
      {/* Brain Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0 }}
        className="relative flex-shrink-0 overflow-hidden border-r border-charcoal/5 bg-white/30 backdrop-blur-sm"
      >
        <div className="flex h-full w-[320px] flex-col p-6">
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

          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-charcoal/40">
              Your Brain
            </h3>
            <button
              onClick={handleCreateNote}
              className="text-sage hover:bg-sage/10 rounded-lg p-1 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <div className="flex-grow space-y-1 overflow-y-auto no-scrollbar pb-20">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${activeNoteId === note.id
                  ? "bg-sage/10 text-sage"
                  : "text-charcoal/60 hover:bg-charcoal/5"
                  }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate text-sm font-medium">{note.title}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto aspect-square rounded-2xl bg-charcoal/5 border border-charcoal/10 flex flex-col items-center justify-center text-center p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30">
              Graph View
            </span>
          </div>
        </div>
      </motion.aside>

      {/* Main Canvas */}
      <main className="relative flex-grow overflow-y-auto bg-parchment/50">
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
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-charcoal/30 uppercase tracking-widest font-bold">
                {saving ? "Saving changes..." : lastSaved ? `Synced ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Ready"}
              </span>
            </div>
          </div>

          <div className="rounded-full bg-sage/10 px-6 py-2 text-xs font-bold text-sage border border-sage/20">
            Garden Connected
          </div>
        </div>

        <div className="mx-auto max-w-3xl pt-24 pb-32 px-4 relative">
          <input
            type="text"
            value={activeNote?.title || ""}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-transparent font-serif text-5xl font-bold text-charcoal mb-12 focus:outline-none border-none placeholder:text-charcoal/10"
            placeholder="Untitled Reflection"
            disabled={!activeNoteId}
          />

          <EditorContent editor={editor} />

          {/* Slash Command Menu */}
          <AnimatePresence>
            {showCommands && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute left-4 top-[300px] w-64 rounded-2xl bg-white p-2 shadow-2xl border border-charcoal/5 z-50"
              >
                <div className="px-3 py-2 text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">Commands</div>
                <button
                  onClick={() => {
                    editor?.commands.deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from });
                    editor?.commands.insertContent({ type: 'drawing' });
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
      `}</style>
    </div>
  );
}
