"use client";

import Image from "next/image";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────

export type ReviewFeedItem = {
  type: "review";
  id: string;
  user: { name: string; handle: string; image: string | null };
  book: { id: string; title: string; authors: string[]; thumbnail: string | null };
  rating: number;
  content: string | null;
  vibeTags: string[];
  createdAt: Date;
};

export type ShelfFeedItem = {
  type: "shelf";
  id: string;
  user: { name: string; handle: string; image: string | null };
  book: { id: string; title: string; authors: string[]; thumbnail: string | null };
  shelfName: string;
  createdAt: Date;
};

export type FeedItem = ReviewFeedItem | ShelfFeedItem;

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? "#8A9A5B" : "none"}
          stroke="#8A9A5B"
          strokeWidth="2"
          className="flex-shrink-0"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="ml-1 text-[10px] font-bold text-sage">{rating.toFixed(1)}</span>
    </span>
  );
}

// ── Avatar ───────────────────────────────────────────────────

function UserAvatar({ user }: { user: FeedItem["user"] }) {
  return (
    <Link href={`/profile/${user.handle}`} className="group flex-shrink-0">
      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-charcoal/10 transition-opacity group-hover:opacity-80">
        {user.image ? (
          <Image src={user.image} alt={user.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-sage text-sm font-bold text-white">
            {user.name[0]}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── BookThumbnail ────────────────────────────────────────────

function BookThumbnail({ book }: { book: FeedItem["book"] }) {
  return (
    <Link href={`/book/${book.id}`} className="group flex-shrink-0">
      <div className="relative h-16 w-11 overflow-hidden rounded shadow-sm transition-transform group-hover:scale-105">
        {book.thumbnail ? (
          <Image src={book.thumbnail} alt={book.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-charcoal/10 text-[8px] font-bold uppercase tracking-wider text-charcoal/40">
            {book.title[0]}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── ReviewCard ───────────────────────────────────────────────

function ReviewCard({ item }: { item: ReviewFeedItem }) {
  return (
    <article className="flex gap-4 border-b border-stone-200 py-6 first:pt-0 last:border-0">
      <UserAvatar user={item.user} />

      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug text-charcoal">
            <Link href={`/profile/${item.user.handle}`} className="font-semibold hover:text-sage transition-colors">
              {item.user.name}
            </Link>
            <span className="text-charcoal/50"> reviewed </span>
            <Link href={`/book/${item.book.id}`} className="font-semibold italic hover:text-sage transition-colors">
              {item.book.title}
            </Link>
          </p>
          <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-widest text-charcoal/30">
            {timeAgo(item.createdAt)}
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-3">
          <StarRating rating={item.rating} />
          {item.vibeTags.length > 0 && (
            <div className="flex gap-1">
              {item.vibeTags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-sage/10 px-2 py-0.5 text-[10px] font-medium text-sage">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {item.content && (
          <p className="mt-2 line-clamp-3 font-serif text-sm leading-relaxed text-charcoal/70 italic">
            "{item.content}"
          </p>
        )}
      </div>

      <BookThumbnail book={item.book} />
    </article>
  );
}

// ── ShelfCard ────────────────────────────────────────────────

function ShelfCard({ item }: { item: ShelfFeedItem }) {
  return (
    <article className="flex gap-4 border-b border-stone-200 py-6 first:pt-0 last:border-0">
      <UserAvatar user={item.user} />

      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug text-charcoal">
            <Link href={`/profile/${item.user.handle}`} className="font-semibold hover:text-sage transition-colors">
              {item.user.name}
            </Link>
            <span className="text-charcoal/50"> added </span>
            <Link href={`/book/${item.book.id}`} className="font-semibold italic hover:text-sage transition-colors">
              {item.book.title}
            </Link>
            <span className="text-charcoal/50"> to </span>
            <span className="font-medium text-charcoal">
              {item.shelfName}
            </span>
          </p>
          <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-widest text-charcoal/30">
            {timeAgo(item.createdAt)}
          </span>
        </div>

        <p className="mt-1 text-[10px] uppercase tracking-widest text-charcoal/30 font-bold">
          {item.book.authors[0]}
        </p>
      </div>

      <BookThumbnail book={item.book} />
    </article>
  );
}

// ── FeedCard (dispatcher) ────────────────────────────────────

export function FeedCard({ item }: { item: FeedItem }) {
  if (item.type === "review") return <ReviewCard item={item} />;
  return <ShelfCard item={item} />;
}
