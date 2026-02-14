import Link from "next/link";
import { searchBooks } from "~/lib/books";
import Image from "next/image";

export default async function LandingPage() {
  // Fetch some "vibe" books for the background
  const featuredBooks = await searchBooks("classic literature").catch(() => []);
  const displayBooks = featuredBooks.slice(0, 15);

  return (
    <div className="relative min-h-[calc(100vh-6rem)] overflow-hidden">
      {/* Visual Background - Masonry-ish Grid */}
      <div className="absolute inset-0 z-0 opacity-20 blur-[2px]">
        <div className="grid grid-cols-3 gap-4 md:grid-cols-5 lg:grid-cols-6">
          {displayBooks.map((book, i) => (
            <div
              key={book.id}
              className={`aspect-[2/3] w-full overflow-hidden rounded-lg bg-charcoal/5 ${
                i % 2 === 0 ? "mt-12" : ""
              }`}
            >
              {book.thumbnail && (
                <Image
                  src={book.thumbnail}
                  alt=""
                  width={200}
                  height={300}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
        {/* Fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-parchment via-transparent to-parchment" />
      </div>

      {/* Hero Content */}
      <main className="relative z-10 flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl">
          <h1 className="mb-6 font-serif text-6xl font-bold tracking-tight text-charcoal md:text-8xl">
            Curate your mind. <br />
            <span className="text-sage">Connect through pages.</span>
          </h1>
          <p className="mb-10 font-sans text-xl text-charcoal/60 md:text-2xl">
            Your digital bookshelf, reimagined for the modern reader.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/search"
              className="rounded-full bg-sage px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-sage/20 transition-all hover:scale-105 hover:bg-sage/90 active:scale-95"
            >
              Start Tracking
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-charcoal/10 bg-white/50 px-10 py-4 text-lg font-semibold text-charcoal backdrop-blur-sm transition-all hover:bg-white/80 active:scale-95"
            >
              Explore Books
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
