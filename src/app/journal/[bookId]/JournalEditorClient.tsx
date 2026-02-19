"use client";

import dynamic from "next/dynamic";

type Note = {
    id: string;
    title: string;
    content: unknown;
    tags: string[];
    createdAt: Date;
};

type Book = {
    id: string;
    title: string;
    thumbnail: string | null;
    authors: string[];
};

const JournalEditor = dynamic(
    () =>
        import("~/components/journal/JournalEditor").then(
            (mod) => mod.JournalEditor,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 flex items-center justify-center bg-parchment">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage border-t-transparent" />
                    <p className="font-serif text-charcoal/40 italic">
                        Opening your digital garden...
                    </p>
                </div>
            </div>
        ),
    },
);

export function JournalEditorClient({
    book,
    initialNotes,
}: {
    book: Book;
    initialNotes: Note[];
}) {
    return <JournalEditor book={book} initialNotes={initialNotes} />;
}
