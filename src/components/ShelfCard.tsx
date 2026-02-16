"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

type ShelfWithBooks = {
  id: string;
  name: string;
  books: {
    thumbnail: string | null;
  }[];
};

export function ShelfCard({ shelf }: { shelf: ShelfWithBooks }) {
  const books = shelf.books.slice(0, 3).reverse(); // Get up to 3 books for the stack
  const empty = books.length === 0;

  return (
    <Link href={`/shelf/${shelf.id}`} className="group block">
      <div className="relative aspect-[3/4] w-full transition-transform duration-300 group-hover:scale-105">
        {empty ? (
          // Empty State
          <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-charcoal/20 bg-charcoal/5">
            <div className="text-center">
              <svg
                className="mx-auto mb-2 h-10 w-10 text-charcoal/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="font-serif text-sm text-charcoal/60">Empty Shelf</span>
            </div>
          </div>
        ) : (
          // Book Stack
          <div className="relative h-full w-full">
            {books.map((book, index) => {
              // Calculate stack position styles
              // Reverse index logic: 0 is back, 1 is mid, 2 is front (if 3 items)
              // But books array is reversed, so last item in original list is first here?
              // Let's rethink. If we have 3 books: A, B, C.
              // We want C in front, B mid, A back.
              // slice(0, 3) gives [A, B, C]. reverse() gives [C, B, A].
              // So index 0 is C (Front), 1 is B (Mid), 2 is A (Back).
              
              // Wait, typical stack logic:
              // Back item: scale-90 -translate-y-4 -rotate-6
              // Mid item: scale-95 -translate-y-2 rotate-3
              // Front item: scale-100 shadow-xl
              
              // If index 0 is Front (C):
              // index 1 is Mid (B)
              // index 2 is Back (A)
              
              const isFront = index === 0;
              const isMid = index === 1;
              const isBack = index === 2;

              let transformClass = "";
              if (isFront) transformClass = "z-30 scale-100 shadow-xl rotate-0";
              else if (isMid) transformClass = "z-20 scale-95 -translate-y-2 rotate-3 opacity-90";
              else if (isBack) transformClass = "z-10 scale-90 -translate-y-4 -rotate-6 opacity-80";

              return (
                <div
                  key={index}
                  className={`absolute inset-x-4 bottom-0 top-8 overflow-hidden rounded-md bg-charcoal/20 transition-all duration-300 ${transformClass}`}
                >
                   {book.thumbnail ? (
                    <Image
                      src={book.thumbnail}
                      alt="Book Cover"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-sage/20" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <h3 className="font-serif text-lg font-bold text-charcoal">{shelf.name}</h3>
        <p className="font-sans text-xs font-medium text-stone-500">
          {shelf.books.length} {shelf.books.length === 1 ? "book" : "books"}
        </p>
      </div>
    </Link>
  );
}
