"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

type Book = {
  id: string;
  title: string;
  thumbnail: string | null;
  highResImage: string | null;
  authors: string[];
};

export function GalleryView({ books }: { books: Book[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Intersection observer to track active book
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setActiveIndex(index);
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.6,
        rootMargin: "0px -25% 0px -25%",
      }
    );

    const elements = containerRef.current?.querySelectorAll("[data-book-item]");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [books.length]);

  const activeBook = books[activeIndex];

  return (
    <div className="relative h-[calc(100vh-6rem)] w-full overflow-hidden bg-parchment transition-colors duration-1000">
      {/* Watercolor Background Blob */}
      <motion.div
        key={activeBook?.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.15, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 h-[800px] w-[800px] rounded-full blur-[120px]"
        style={{
          backgroundColor: activeIndex % 2 === 0 ? "#8A9A5B" : "#D4A373", // Sage vs Mocha
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-center">
        {/* Horizontal Scroll Container */}
        <div
          ref={containerRef}
          className="flex snap-x snap-mandatory overflow-x-auto px-[35vw] pb-20 pt-12 no-scrollbar"
          style={{ scrollBehavior: "smooth" }}
        >
          {books.map((book, i) => (
            <div
              key={book.id}
              data-index={i}
              data-book-item
              className="flex-shrink-0 snap-center px-12"
            >
              <Link href={`/journal/${book.id}`}>
                <motion.div
                  animate={{
                    scale: activeIndex === i ? 1.1 : 0.85,
                    filter: activeIndex === i ? "grayscale(0%)" : "grayscale(20%)",
                    opacity: activeIndex === i ? 1 : 0.6,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  className={`relative h-[450px] w-[300px] overflow-hidden rounded-r-2xl rounded-l-md transition-shadow duration-500 ${
                    activeIndex === i ? "shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)]" : "shadow-md"
                  }`}
                >
                  {book.thumbnail ? (
                    <Image
                      src={book.highResImage || book.thumbnail || ""}
                      alt={book.title}
                      fill
                      className="object-cover"
                      priority={i === 0}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-charcoal/5">
                      <span className="font-serif text-charcoal/20 text-xl">No Cover</span>
                    </div>
                  )}
                  {/* Page Edge Detail */}
                  <div className="absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-black/10 to-transparent" />
                </motion.div>
              </Link>
            </div>
          ))}
        </div>

        {/* Active Metadata */}
        <div className="text-center">
          <motion.div
            key={activeBook?.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h2 className="font-serif text-4xl font-bold text-charcoal">
              {activeBook?.title}
            </h2>
            <p className="font-sans text-lg text-charcoal/60 uppercase tracking-widest font-medium">
              {activeBook?.authors.join(", ")}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Style tag for no-scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
