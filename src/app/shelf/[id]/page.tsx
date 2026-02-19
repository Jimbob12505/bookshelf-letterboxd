import { getShelfById } from "~/server/actions";
import { notFound } from "next/navigation";
import { GalleryView } from "~/components/shelf/GalleryView";
import Link from "next/link";

export default async function ShelfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shelf = await getShelfById(id);

  if (!shelf) {
    notFound();
  }

  if (shelf.books.length === 0) {
    // ... same empty state ...
  }

  return (
    <div>
      <div className="absolute left-1/2 top-24 z-20 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-charcoal/90">
          {shelf.name}
        </h1>
        <p className="font-sans text-sm font-medium uppercase tracking-widest text-charcoal/40">
          {shelf.books.length} Books
        </p>
      </div>
      <GalleryView books={shelf.books} />
    </div>
  );
}
