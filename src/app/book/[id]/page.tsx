import { getBook } from "~/lib/books";
import Image from "next/image";
import { getUserShelves } from "~/server/actions";
import { ShelfSelector } from "~/components/ShelfSelector";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await getBook(id);
  const shelves = await getUserShelves();
  const serializedShelves = shelves.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center bg-parchment p-8 lg:flex-row lg:gap-16">
      {/* Left: Book Cover (The "Reflected" Shadow) */}
      <div className="relative mb-12 w-full max-w-sm lg:mb-0 lg:w-1/3">
        <div className="relative aspect-[2/3] overflow-hidden rounded-r-2xl rounded-l-md shadow-2xl transition-transform hover:scale-[1.02]">
          {book.highResImage || book.thumbnail ? (
            <Image
              src={book.highResImage || book.thumbnail || ""}
              alt={book.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-charcoal/10">
              <span className="font-serif text-charcoal/40">No Cover</span>
            </div>
          )}
          {/* Spine Highlight */}
          <div className="absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-black/20 to-transparent" />
        </div>
        
        {/* Reflection */}
        <div className="absolute -bottom-12 left-0 h-12 w-full scale-y-[-1] opacity-20 blur-sm mask-image-gradient-to-b">
           {book.highResImage || book.thumbnail ? (
            <Image
              src={book.highResImage || book.thumbnail || ""}
              alt=""
              fill
              className="object-cover"
            />
          ) : null}
        </div>
      </div>

      {/* Right: The "Paper" Section */}
      <div className="w-full max-w-2xl lg:w-1/2">
        <div className="mb-2 flex items-center gap-4 text-sm font-medium uppercase tracking-widest text-sage">
          <span>{book.publishedDate?.split("-")[0] || "Unknown Year"}</span>
          <span>•</span>
          <span>{book.pageCount ? `${book.pageCount} Pages` : "Unknown Length"}</span>
        </div>

        <h1 className="mb-2 font-serif text-5xl font-bold leading-tight text-charcoal lg:text-6xl">
          {book.title}
        </h1>
        
        <p className="mb-8 font-sans text-xl text-charcoal/60">
          by {book.authors.join(", ") || "Unknown Author"}
        </p>

        <div className="mb-8 max-h-60 overflow-y-auto pr-4 font-serif text-lg leading-relaxed text-charcoal/80 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-charcoal/20">
          <div dangerouslySetInnerHTML={{ __html: book.description || "No description available." }} />
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-full sm:w-auto">
            <ShelfSelector bookId={book.id} shelves={serializedShelves} />
          </div>
          
          <button className="rounded-full border border-charcoal/20 px-8 py-3 font-sans font-semibold text-charcoal transition-all hover:bg-charcoal/5 active:scale-95">
            Write a Review
          </button>

          <div className="ml-auto flex items-center gap-1 text-sage">
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="text-xl font-bold">4.5</span>
            <span className="text-sm text-charcoal/40">/5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
