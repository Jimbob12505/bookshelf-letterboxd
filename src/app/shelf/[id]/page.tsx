import { notFound } from "next/navigation";
import { GalleryView } from "~/components/shelf/GalleryView";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function ShelfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const shelf = await db.shelf.findUnique({
    where: { id },
    include: {
      books: true,
      user: { select: { id: true, name: true, handle: true } },
    },
  });

  if (!shelf) {
    notFound();
  }

  const session = await auth();
  const isOwner = session?.user?.id === shelf.userId;

  if (shelf.books.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment">
        <div className="text-center">
          {!isOwner && (
            <Link
              href={shelf.user.handle ? `/profile/${shelf.user.handle}` : "#"}
              className="mb-6 inline-block text-xs font-bold uppercase tracking-widest text-charcoal/40 transition-colors hover:text-charcoal/70"
            >
              ← {shelf.user.handle ? `@${shelf.user.handle}` : shelf.user.name ?? "Reader"}&apos;s profile
            </Link>
          )}
          <h1 className="font-serif text-3xl font-bold text-charcoal/90">{shelf.name}</h1>
          <p className="mt-2 font-sans text-sm text-charcoal/40">This shelf is empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="absolute left-1/2 top-24 z-20 -translate-x-1/2 text-center pointer-events-none">
        {!isOwner && (
          <Link
            href={shelf.user.handle ? `/profile/${shelf.user.handle}` : "#"}
            className="pointer-events-auto mb-2 inline-block text-xs font-bold uppercase tracking-widest text-charcoal/40 transition-colors hover:text-charcoal/70"
          >
            ← {shelf.user.handle ? `@${shelf.user.handle}` : shelf.user.name ?? "Reader"}&apos;s profile
          </Link>
        )}
        <h1 className="font-serif text-3xl font-bold tracking-tight text-charcoal/90">
          {shelf.name}
        </h1>
        <p className="font-sans text-sm font-medium uppercase tracking-widest text-charcoal/40">
          {shelf.books.length} {shelf.books.length === 1 ? "Book" : "Books"}
        </p>
      </div>
      <GalleryView books={shelf.books} isOwner={isOwner} />
    </div>
  );
}
