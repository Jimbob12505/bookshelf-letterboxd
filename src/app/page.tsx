"use client";

import { useState } from "react";
import { BookCard } from "~/components/BookCard";
import { api } from "~/trpc/react";

export default function Home() {
  const [query, setQuery] = useState("");
  const { data: books, isLoading } = api.book.search.useQuery(
    { query },
    { enabled: query.length > 2 }
  );

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mb-16">
        <h1 className="mb-4 font-serif text-5xl font-bold tracking-tight text-charcoal">
          Search
        </h1>
        <input
          type="text"
          placeholder="Find your next story..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-b border-charcoal/20 bg-transparent py-4 font-serif text-3xl focus:border-charcoal focus:outline-none transition-colors"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-charcoal/5" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {books?.map((book) => (
          <BookCard key={book.id} book={book} layoutId={`book-${book.id}`} />
        ))}
      </div>
    </main>
  );
}
