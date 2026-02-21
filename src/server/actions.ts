"use server";

import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { getBook } from "~/lib/books";
import { revalidatePath } from "next/cache";

// ---- Username ----

/** Validates and updates the current user's handle. Throws a user-facing error on conflict. */
export async function updateHandle(newHandle: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cleaned = newHandle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (cleaned.length < 3) throw new Error("Username must be at least 3 characters.");
  if (cleaned.length > 30) throw new Error("Username must be 30 characters or fewer.");

  const existing = await db.user.findUnique({ where: { handle: cleaned } });
  if (existing && existing.id !== session.user.id) {
    throw new Error(`@${cleaned} is already taken. Please choose another.`);
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { handle: cleaned },
  });

  revalidatePath("/profile");
}

/** Search users by handle or name (case-insensitive prefix match). */
export async function searchUsers(query: string) {
  const q = query.trim();
  if (q.length < 1) return [];

  return db.user.findMany({
    where: {
      OR: [
        { handle: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      handle: true,
      image: true,
      _count: { select: { followedBy: true } },
    },
    take: 10,
  });
}

// ---- Social ----

export async function followUser(targetUserId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.id === targetUserId) throw new Error("Cannot follow yourself");

  await db.user.update({
    where: { id: session.user.id },
    data: { following: { connect: { id: targetUserId } } },
  });

  revalidatePath("/community");
}

export async function unfollowUser(targetUserId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.user.update({
    where: { id: session.user.id },
    data: { following: { disconnect: { id: targetUserId } } },
  });

  revalidatePath("/community");
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { following: { where: { id: targetUserId }, select: { id: true } } },
  });

  return (user?.following.length ?? 0) > 0;
}

// ---- Shelves & Journal ----

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
  const shelf = await db.shelf.update({
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

  // 4. Record activity for the community feed (ignore duplicates silently)
  await db.activity.upsert({
    where: {
      // Use a synthetic unique key: one activity per user+book+shelf combo
      userId_bookId_shelfId: { userId: session.user.id, bookId: book.id, shelfId },
    },
    create: {
      type: "SHELF_ADD",
      userId: session.user.id,
      bookId: book.id,
      shelfId,
      shelfName: shelf.name,
    },
    update: {}, // already recorded, skip
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

// ---- Lounges ----

export async function joinLounge(loungeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.loungeMembership.upsert({
    where: { userId_loungeId: { userId: session.user.id, loungeId } },
    create: { userId: session.user.id, loungeId },
    update: {},
  });

  revalidatePath(`/lounge/${loungeId}`);
}

export async function sendLoungeMessage(loungeId: string, text: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  // Auto-join if not a member
  await db.loungeMembership.upsert({
    where: { userId_loungeId: { userId: session.user.id, loungeId } },
    create: { userId: session.user.id, loungeId },
    update: {},
  });

  const message = await db.loungeMessage.create({
    data: { text: trimmed, userId: session.user.id, loungeId },
  });

  return message;
}

export async function createLounge(name: string, description?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const lounge = await db.lounge.create({
    data: {
      name,
      description,
      creatorId: session.user.id,
      members: { create: { userId: session.user.id } },
    },
  });

  revalidatePath("/community");
  return lounge;
}
