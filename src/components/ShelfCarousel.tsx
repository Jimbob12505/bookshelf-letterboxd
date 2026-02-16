"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

type Book = {
  id: string;
  title: string;
  thumbnail: string | null;
  highResImage: string | null;
  authors: string[];
};

export function ShelfCarousel({ books }: { books: Book[] }) {
  const [index, setIndex] = useState(0);

  if (books.length === 0) return null;

  const currentBook = books[index];

  return (
    <div className="relative h-[calc(100vh-6rem)] w-full overflow-hidden bg-black/90">
      {/* Dynamic Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBook?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
        >
          {currentBook?.highResImage || currentBook?.thumbnail ? (
            <Image
              src={currentBook.highResImage || currentBook.thumbnail || ""}
              alt=""
              fill
              className="object-cover blur-3xl scale-110"
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* 3D Carousel Deck */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center pt-12">
        <div className="relative h-[500px] w-full max-w-4xl perspective-1000">
          <div className="flex h-full items-center justify-center gap-8 px-4">
            {books.map((book, i) => {
              const isActive = i === index;
              const isPrev = i === (index - 1 + books.length) % books.length;
              const isNext = i === (index + 1) % books.length;

              if (!isActive && !isPrev && !isNext && books.length > 3) return null;

              let x = 0;
              let rotateY = 0;
              let z = 0;
              let scale = 0.8;
              let opacity = 0.4;

              if (isActive) {
                x = 0;
                rotateY = 0;
                z = 100;
                scale = 1;
                opacity = 1;
              } else if (isPrev) {
                x = -250;
                rotateY = 45;
                z = -100;
              } else if (isNext) {
                x = 250;
                rotateY = -45;
                z = -100;
              }

              return (
                <motion.div
                  key={book.id}
                  animate={{
                    x,
                    rotateY,
                    z,
                    scale,
                    opacity,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="absolute cursor-pointer"
                  onClick={() => {
                    if (isActive) {
                      // Navigate to Journal
                    } else {
                      setIndex(i);
                    }
                  }}
                >
                  <Link href={`/journal/${book.id}`}>
                    <div className="relative h-[450px] w-[300px] overflow-hidden rounded-r-2xl rounded-l-md shadow-2xl transition-all duration-500 hover:shadow-sage/30">
                      {book.thumbnail ? (
                        <Image
                          src={book.highResImage || book.thumbnail || ""}
                          alt={book.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/10 backdrop-blur-sm">
                          <span className="font-serif text-white/40">No Cover</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {isActive && (
                        <div className="absolute bottom-0 w-full p-6 text-center">
                          <h3 className="font-serif text-2xl font-bold text-white shadow-sm">
                            {book.title}
                          </h3>
                          <p className="text-sm font-sans text-white/70">
                            {book.authors.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="mt-12 flex gap-6">
          <button
            onClick={() => setIndex((i) => (i - 1 + books.length) % books.length)}
            className="rounded-full border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            ←
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % books.length)}
            className="rounded-full border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
