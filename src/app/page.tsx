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
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search for books..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-b-2 border-charcoal bg-transparent px-2 py-1 text-2xl font-serif focus:outline-none"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 w-full animate-pulse rounded-lg bg-gray-300" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {books?.map((book) => (
          <BookCard key={book.id} book={book} layoutId={`book-${book.id}`} />
        ))}
      </div>
    </main>
  );
}
