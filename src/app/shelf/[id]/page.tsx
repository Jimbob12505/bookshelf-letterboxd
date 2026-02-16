import { getShelfById } from "~/server/actions";
import { notFound } from "next/navigation";
import { ShelfCarousel } from "~/components/ShelfCarousel";
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
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col items-center justify-center bg-parchment p-8 text-center">
        <div className="mb-8 h-32 w-32 opacity-10">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="mb-4 font-serif text-4xl font-bold text-charcoal">
          {shelf.name} is empty
        </h1>
        <p className="mb-10 max-w-md font-sans text-charcoal/60">
          Your collection starts with a single page. Explore our library to find your next favorite read.
        </p>
        <Link
          href="/search"
          className="rounded-full bg-sage px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-sage/20 transition-all hover:scale-105 hover:bg-sage/90 active:scale-95"
        >
          Browse Books
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="absolute left-1/2 top-24 z-20 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white/90">
          {shelf.name}
        </h1>
        <p className="font-sans text-sm font-medium uppercase tracking-widest text-white/40">
          {shelf.books.length} Books
        </p>
      </div>
      <ShelfCarousel books={shelf.books} />
    </div>
  );
}
