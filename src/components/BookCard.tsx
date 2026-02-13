"use client";

import { useState } from "react";
import type { Book } from "~/lib/books";
import { motion } from "framer-motion";
import Image from "next/image";

type BookCardProps = {
  book: Book;
  layoutId: string;
};

function BookCoverPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black/5 p-4">
      <div className="text-center text-charcoal">
        <svg
          className="mx-auto h-12 w-12 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1"
            d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1"
            d="M9 9l6 6m0-6l-6 6"
          />
        </svg>
        <p className="mt-2 text-sm font-serif text-charcoal/70">No Cover</p>
      </div>
    </div>
  );
}

export function BookCard({ book, layoutId }: BookCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      layoutId={layoutId}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative flex aspect-[2/3] w-full flex-col overflow-hidden rounded-2xl shadow-tactile transition-shadow duration-500 hover:shadow-2xl"
    >
      <div className="relative h-full w-full bg-parchment/50">
        {book.thumbnail && !imageError ? (
          <Image
            src={book.thumbnail}
            alt={`${book.title} cover`}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-700 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <BookCoverPlaceholder />
        )}
      </div>

      {/* Glass Metadata Overlay */}
      <div className="absolute inset-x-3 bottom-3 overflow-hidden rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-md transition-all duration-300 group-hover:bg-white/60">
        <h3 className="line-clamp-2 font-serif text-lg font-bold leading-tight text-charcoal">
          {book.title}
        </h3>
        <p className="mt-1 line-clamp-1 font-sans text-xs font-medium tracking-wide uppercase text-charcoal/60">
          {book.authors?.join(", ") ?? "Unknown Author"}
        </p>
      </div>

      <div className="absolute right-4 top-4 flex translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="rounded-full bg-sage p-3 text-white shadow-lg backdrop-blur-md"
        >
          <PlusIcon />
        </motion.button>
      </div>
    </motion.div>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

