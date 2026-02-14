"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Session } from "next-auth";
import Image from "next/image";
import { signIn, signOut } from "next-auth/react";

export default function Navbar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Discover", href: "/search" },
    { name: "Community", href: "#", disabled: true },
    { name: "My Shelf", href: "/profile" },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-full border border-white/20 bg-white/40 shadow-tactile backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2">
              <span className="font-serif text-2xl font-bold tracking-tighter text-charcoal transition-colors group-hover:text-sage">
                BookBound
              </span>
            </Link>

            {/* Links */}
            <div className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative font-sans text-sm font-medium tracking-wide transition-colors ${
                    link.disabled
                      ? "cursor-not-allowed opacity-40"
                      : "text-charcoal/60 hover:text-charcoal"
                  } ${pathname === link.href ? "text-charcoal" : ""}`}
                >
                  {link.name}
                  {pathname === link.href && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 h-px w-full bg-charcoal"
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Auth */}
            <div className="flex items-center gap-4">
              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex h-10 w-10 overflow-hidden rounded-full border border-charcoal/10 transition-transform hover:scale-105 active:scale-95"
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name ?? "User"}
                        width={40}
                        height={40}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-sage text-white">
                        {session.user.name?.[0] ?? "U"}
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-white/20 bg-white/80 p-2 shadow-tactile backdrop-blur-lg"
                      >
                        <button
                          onClick={() => signOut()}
                          className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 rounded-xl"
                        >
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sage/20 transition-all hover:scale-105 hover:bg-sage/90 active:scale-95"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
