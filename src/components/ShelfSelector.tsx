"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addToShelf, createShelf } from "~/server/actions";
import { useRouter } from "next/navigation";

type Shelf = {
  id: string;
  name: string;
};

export function ShelfSelector({
  bookId,
  shelves,
}: {
  bookId: string;
  shelves: Shelf[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localShelves, setLocalShelves] = useState<Shelf[]>(shelves);
  const [newShelfName, setNewShelfName] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToShelf = async (shelfId: string) => {
    setLoading(true);
    try {
      await addToShelf(bookId, shelfId);
      setIsOpen(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error("Failed to add to shelf:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShelf = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newShelfName.trim()) {
      setLoading(true);
      try {
        const newShelf = await createShelf(newShelfName);
        if (newShelf) {
            setLocalShelves([...localShelves, newShelf]);
            setNewShelfName("");
            // Automatically add to the new shelf
            await handleAddToShelf(newShelf.id);
        }
      } catch (error) {
        console.error("Failed to create shelf:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (justAdded) {
    return (
      <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-sage/20 px-8 text-sage">
        <motion.div
          initial={{ rotate: -10, y: -20, opacity: 0 }}
          animate={{ rotate: 0, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mr-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
             <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-2V5h2v6zm-4 4H9v-2h6v2zm0-4H9V9h6v2zm0-4H9V5h6v2z" />
          </svg>
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="font-serif font-bold"
        >
          Added!
        </motion.span>
      </div>
    );
  }

  return (
    <div className="relative w-full sm:w-64">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-full bg-sage px-8 py-3 font-sans font-semibold text-white shadow-tactile transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Saving..." : "Add to Shelf"}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
            className="absolute left-0 top-full z-20 mt-4 w-full origin-top overflow-hidden rounded-b-xl rounded-t-sm border-t-4 border-sage bg-parchment shadow-2xl"
          >
            <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sage/20">
              {localShelves.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {localShelves.map((shelf) => (
                    <button
                      key={shelf.id}
                      onClick={() => handleAddToShelf(shelf.id)}
                      className="group flex w-full items-center justify-between rounded-lg px-4 py-3 text-left font-serif text-sm text-charcoal transition-colors hover:bg-sage/10"
                    >
                      <span>{shelf.name}</span>
                      <span className="opacity-0 transition-opacity group-hover:opacity-100 text-sage">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs italic text-charcoal/40">
                  Start your collection...
                </div>
              )}
            </div>

            {/* "Magic" Input */}
            <div className="border-t border-charcoal/10 bg-white/30 p-3 backdrop-blur-sm">
              <input
                type="text"
                placeholder="+ Create new shelf..."
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                onKeyDown={handleCreateShelf}
                className="w-full bg-transparent px-2 py-1 font-sans text-sm text-charcoal placeholder-charcoal/40 outline-none focus:placeholder-transparent"
                disabled={loading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
