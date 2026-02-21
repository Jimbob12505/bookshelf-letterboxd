"use server";

// ---- Journal / Notes ----

import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { getBook } from "~/lib/books";
import { revalidatePath } from "next/cache";

export async function getUserShelves() {
  const session = await auth();
  if (!session?.user) {
    return [];
  }

  return db.shelf.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
}

export async function createShelf(name: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const shelf = await db.shelf.create({
    data: {
      name,
      userId: session.user.id,
    },
  });

  revalidatePath("/profile");
  return shelf;
}

export async function addToShelf(bookId: string, shelfId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // 1. Check if book exists in DB
  let book = await db.book.findUnique({
    where: { id: bookId },
  });

  // 2. If not, fetch from Google Books and save
  if (!book) {
    try {
      const googleBook = await getBook(bookId);
      book = await db.book.create({
        data: {
          id: googleBook.id,
          title: googleBook.title,
          subtitle: googleBook.subtitle,
          authors: googleBook.authors,
          publisher: googleBook.publisher,
          publishedDate: googleBook.publishedDate,
          description: googleBook.description,
          pageCount: googleBook.pageCount,
          thumbnail: googleBook.thumbnail,
          highResImage: googleBook.highResImage,
          isbn10: googleBook.isbn10,
          isbn13: googleBook.isbn13,
        },
      });
    } catch (error) {
      console.error("Failed to fetch/create book:", error);
      throw new Error("Could not find book details");
    }
  }

  // 3. Add to Shelf (using connect on the many-to-many relation)
  await db.shelf.update({
    where: {
      id: shelfId,
      userId: session.user.id, // Security check
    },
    data: {
      books: {
        connect: { id: book.id },
      },
    },
  });

  revalidatePath("/profile");
  revalidatePath(`/book/${bookId}`);
  revalidatePath(`/shelf/${shelfId}`);
}

export async function getShelfById(id: string) {
  const session = await auth();
  if (!session?.user) return null;

  return db.shelf.findUnique({
    where: { id, userId: session.user.id },
    include: {
      books: true,
    },
  });
}

export async function getNotesByBook(bookId: string) {
  const session = await auth();
  if (!session?.user) return [];

  return db.note.findMany({
    where: { bookId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNote(bookId: string, title: string = "Untitled Reflection") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const note = await db.note.create({
    data: {
      title,
      userId: session.user.id,
      bookId,
      content: {
        type: "doc",
        content: [{ type: "paragraph" }]
      } as any,
    },
  });

  revalidatePath(`/journal/${bookId}`);
  return note;
}

export async function updateNote(noteId: string, data: { title?: string; content?: any; tags?: string[] }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const note = await db.note.update({
    where: { id: noteId, userId: session.user.id },
    data,
  });

  // Extract bookId to revalidate if needed
  if (note.bookId) {
    revalidatePath(`/journal/${note.bookId}`);
  }

  return note;
}

export async function deleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const note = await db.note.delete({
    where: { id: noteId, userId: session.user.id },
  });

  if (note.bookId) {
    revalidatePath(`/journal/${note.bookId}`);
  }

  return note;
}

/** Returns all notes for a book with their outgoing wiki-link ids — used to build the graph. */
export async function getNoteLinks(bookId: string) {
  const session = await auth();
  if (!session?.user) return [];

  return db.note.findMany({
    where: { bookId, userId: session.user.id },
    select: { id: true, title: true, linksTo: { select: { id: true } } },
  });
}

/** Replaces the full set of outgoing wiki-links for a note. */
export async function updateNoteLinks(noteId: string, linkedNoteIds: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const note = await db.note.update({
    where: { id: noteId, userId: session.user.id },
    data: {
      linksTo: {
        set: linkedNoteIds.map((id) => ({ id })),
      },
    },
  });

  return note;
}

export async function saveJournalEntry(
  bookId: string,
  content: string,
  page?: number,
  type: string = "note"
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // For now, we store content as a simple JSON object for compatibility with the Note model
  const entry = await db.note.create({
    data: {
      title: page ? `Page ${page}` : "New Reflection",
      content: { text: content } as any, // Temporary simple format
      tags: [type],
      userId: session.user.id,
      bookId,
    },
  });

  revalidatePath(`/journal/${bookId}`);
  return entry;
}
