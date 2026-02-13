"use client";

import type { Book } from "~/lib/books";
import { motion } from "framer-motion";
import Image from "next/image";

type BookCardProps = {
  book: Book;
  layoutId: string;
};

export function BookCard({ book, layoutId }: BookCardProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-300 hover:shadow-xl"
    >
      <div className="relative h-64 w-full">
        {book.thumbnail && (
          <Image
            src={book.thumbnail}
            alt={`${book.title} cover`}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 p-4">
        <h3 className="font-serif text-lg font-bold text-white">
          {book.title}
        </h3>
        <p className="text-sm text-gray-300">
          {book.authors?.join(", ") ?? "Unknown Author"}
        </p>
      </div>

      <div className="absolute right-4 top-4 flex translate-y-[-150%] flex-col items-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="rounded-full bg-sage p-3 text-white shadow-lg"
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
