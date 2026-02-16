"use server";

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

export async function saveJournalEntry(
  bookId: string,
  content: string,
  page?: number,
  type: string = "note"
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const entry = await db.journalEntry.create({
    data: {
      content,
      page,
      type,
      userId: session.user.id,
      bookId,
    },
  });

  revalidatePath(`/journal/${bookId}`);
  return entry;
}
