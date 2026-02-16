"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createShelf } from "~/server/actions";

export function CreateShelfModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createShelf(name);
      setIsOpen(false);
      setName("");
    } catch (error) {
      console.error("Failed to create shelf", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-semibold text-sage hover:underline"
      >
        + Create New Shelf
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-parchment p-8 shadow-2xl"
            >
              <h2 className="mb-6 font-serif text-2xl font-bold text-charcoal">
                New Collection
              </h2>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-charcoal/60">
                    Shelf Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Dark Academia, Summer Reads"
                    className="w-full border-b-2 border-charcoal/20 bg-transparent py-2 font-serif text-xl text-charcoal placeholder-charcoal/30 focus:border-sage focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full px-6 py-2 text-sm font-semibold text-charcoal/60 hover:text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="rounded-full bg-sage px-8 py-2 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Shelf"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
