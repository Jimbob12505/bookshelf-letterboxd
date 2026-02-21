"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { searchUsers, followUser, unfollowUser } from "~/server/actions";

type UserResult = {
  id: string;
  name: string | null;
  handle: string | null;
  image: string | null;
  _count: { followedBy: number };
};

export function UserSearch({ currentUserId }: { currentUserId: string | undefined }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await searchUsers(value);
        setResults(res);
        setHasSearched(true);
      });
    }, 300);
  };

  const toggleFollow = (userId: string, currentlyFollowing: boolean) => {
    setFollowState((prev) => ({ ...prev, [userId]: !currentlyFollowing }));
    startTransition(async () => {
      if (currentlyFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    });
  };

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40">
        Find Readers
      </h2>

      {/* Search input */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by username…"
          className="w-full rounded-xl border border-charcoal/12 bg-white/70 py-2.5 pl-9 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-sage/50 focus:outline-none focus:ring-2 focus:ring-sage/15"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-sage/30 border-t-sage" />
          </div>
        )}
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="mt-2 space-y-1">
          {results.length === 0 ? (
            <p className="px-1 py-3 text-center text-xs text-charcoal/35">
              No readers found for "{query}"
            </p>
          ) : (
            results.map((user) => {
              const isMe = user.id === currentUserId;
              const following = followState[user.id] ?? false;
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white/50 px-3 py-2.5"
                >
                  <Link href={`/profile/${user.handle ?? user.id}`} className="flex-shrink-0">
                    <div className="relative h-9 w-9 overflow-hidden rounded-full border border-charcoal/10">
                      {user.image ? (
                        <Image src={user.image} alt={user.name ?? ""} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-sage/20 text-sm font-bold text-sage">
                          {(user.name ?? "?")[0]}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-grow">
                    <Link
                      href={`/profile/${user.handle ?? user.id}`}
                      className="block truncate text-sm font-semibold text-charcoal hover:text-sage transition-colors"
                    >
                      {user.name ?? "Reader"}
                    </Link>
                    <p className="text-[11px] text-charcoal/40">
                      @{user.handle ?? "—"} · {user._count.followedBy} followers
                    </p>
                  </div>
                  {!isMe && currentUserId && (
                    <button
                      type="button"
                      onClick={() => toggleFollow(user.id, following)}
                      disabled={isPending}
                      className={`flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                        following
                          ? "border border-charcoal/20 text-charcoal/50 hover:border-red-300 hover:text-red-400"
                          : "bg-sage text-white hover:bg-sage/85"
                      }`}
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
