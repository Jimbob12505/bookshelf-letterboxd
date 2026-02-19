import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { getBook } from "~/lib/books";
import { notFound, redirect } from "next/navigation";
import { getNotesByBook } from "~/server/actions";
import { JournalEditorClient } from "./JournalEditorClient";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { bookId } = await params;
  const book = await getBook(bookId);
  if (!book) notFound();

  const notes = await db.note.findMany({
    where: { bookId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-parchment">
      <JournalEditorClient
        book={book}
        initialNotes={notes.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: n.tags,
          createdAt: n.createdAt,
        }))}
      />
    </div>
  );
}
