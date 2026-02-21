import { auth } from "~/server/auth";
import { db } from "~/server/db";
import Link from "next/link";
import Image from "next/image";
import { FeedCard } from "~/components/community/FeedCard";
import type { FeedItem } from "~/components/community/FeedCard";
import { UserSearch } from "~/components/community/UserSearch";
import { FeedTabs } from "~/components/community/FeedTabs";

// ── Lounge fallback ──────────────────────────────────────────

const DUMMY_LOUNGES = [
  { id: "l1", name: "Sci-Fi Salon", description: "Currently reading Hyperion", memberCount: 34 },
  { id: "l2", name: "Dark Academia", description: "Working through The Secret History", memberCount: 21 },
  { id: "l3", name: "Literary Fiction", description: "Discussing Pachinko", memberCount: 18 },
];

// ── Feed builders ────────────────────────────────────────────

const REVIEW_INCLUDE = {
  user: { select: { name: true, handle: true, image: true } },
  book: { select: { id: true, title: true, authors: true, thumbnail: true } },
} as const;

const ACTIVITY_INCLUDE = {
  user: { select: { name: true, handle: true, image: true } },
  book: { select: { id: true, title: true, authors: true, thumbnail: true } },
} as const;

type ReviewRow = Awaited<ReturnType<typeof db.review.findMany<{ include: typeof REVIEW_INCLUDE }>>>[number];
type ActivityRow = Awaited<ReturnType<typeof db.activity.findMany<{ include: typeof ACTIVITY_INCLUDE }>>>[number];

function reviewToFeedItem(r: ReviewRow): FeedItem {
  return {
    type: "review",
    id: r.id,
    user: { name: r.user.name ?? "Reader", handle: r.user.handle ?? "reader", image: r.user.image },
    book: r.book!,
    rating: r.rating,
    content: r.content,
    vibeTags: r.vibeTags,
    createdAt: r.createdAt,
  };
}

function activityToFeedItem(a: ActivityRow): FeedItem | null {
  if (!a.book) return null;
  return {
    type: "shelf",
    id: `act-${a.id}`,
    user: { name: a.user.name ?? "Reader", handle: a.user.handle ?? "reader", image: a.user.image },
    book: a.book,
    shelfName: a.shelfName ?? "a shelf",
    createdAt: a.createdAt,
  };
}

/** Merge review and activity rows into a single feed sorted by createdAt desc. */
function mergeFeed(reviews: ReviewRow[], activities: ActivityRow[]): FeedItem[] {
  const items: FeedItem[] = [
    ...reviews.map(reviewToFeedItem),
    ...activities.map(activityToFeedItem).filter((x): x is FeedItem => x !== null),
  ];
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getGlobalFeed(): Promise<FeedItem[]> {
  // Popular slice: reviews + shelf-adds from users with most followers
  const [popularReviews, popularActivities] = await Promise.all([
    db.review.findMany({
      where: { isPublic: true },
      orderBy: [
        { user: { followedBy: { _count: "desc" } } },
        { rating: "desc" },
        { createdAt: "desc" },
      ],
      take: 12,
      include: REVIEW_INCLUDE,
    }),
    db.activity.findMany({
      where: { type: "SHELF_ADD" },
      orderBy: [
        { user: { followedBy: { _count: "desc" } } },
        { createdAt: "desc" },
      ],
      take: 8,
      include: ACTIVITY_INCLUDE,
    }),
  ]);

  const popularFeed = mergeFeed(popularReviews, popularActivities).slice(0, 15);
  const popularIds = new Set(popularFeed.map((x) => x.id));

  // Random slice for serendipity
  const [totalReviews, totalActivities] = await Promise.all([
    db.review.count({ where: { isPublic: true } }),
    db.activity.count({ where: { type: "SHELF_ADD" } }),
  ]);

  const reviewSkip = totalReviews > 12 ? Math.floor(Math.random() * (totalReviews - 12)) : 0;
  const actSkip = totalActivities > 8 ? Math.floor(Math.random() * (totalActivities - 8)) : 0;

  const [randomReviews, randomActivities] = await Promise.all([
    db.review.findMany({
      where: { isPublic: true, id: { notIn: [...popularIds].filter((id) => !id.startsWith("act-")) } },
      orderBy: { createdAt: "desc" },
      skip: reviewSkip,
      take: 3,
      include: REVIEW_INCLUDE,
    }),
    db.activity.findMany({
      where: {
        type: "SHELF_ADD",
        id: { notIn: [...popularIds].filter((id) => id.startsWith("act-")).map((id) => id.slice(4)) },
      },
      orderBy: { createdAt: "desc" },
      skip: actSkip,
      take: 2,
      include: ACTIVITY_INCLUDE,
    }),
  ]);

  const randomFeed = mergeFeed(randomReviews, randomActivities);

  // Interleave: every 3 popular items, splice in 1 random
  const result: FeedItem[] = [];
  let ri = 0;
  for (let i = 0; i < popularFeed.length; i++) {
    result.push(popularFeed[i]!);
    if ((i + 1) % 3 === 0 && ri < randomFeed.length) {
      result.push(randomFeed[ri++]!);
    }
  }
  while (ri < randomFeed.length) result.push(randomFeed[ri++]!);

  return result;
}

async function getFollowingFeed(userId: string): Promise<FeedItem[]> {
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { following: { select: { id: true } } },
  });

  const followedIds = me?.following.map((u) => u.id) ?? [];
  if (followedIds.length === 0) return [];

  const [reviews, activities] = await Promise.all([
    db.review.findMany({
      where: { userId: { in: followedIds }, isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: REVIEW_INCLUDE,
    }),
    db.activity.findMany({
      where: { userId: { in: followedIds }, type: "SHELF_ADD" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: ACTIVITY_INCLUDE,
    }),
  ]);

  return mergeFeed(reviews, activities).slice(0, 40);
}

// ── Page ─────────────────────────────────────────────────────

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: "global" | "following" = tab === "following" ? "following" : "global";

  const session = await auth();

  // Fetch the right feed
  let feed: FeedItem[] = [];
  if (activeTab === "global") {
    feed = await getGlobalFeed();
  } else if (session?.user) {
    feed = await getFollowingFeed(session.user.id);
  }

  // Real lounges for sidebar
  const lounges = await db.lounge.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { members: true } } },
  });

  const sidebarLounges =
    lounges.length > 0
      ? lounges.map((l) => ({
          id: l.id,
          name: l.name,
          description: l.description ?? "",
          memberCount: l._count.members,
        }))
      : DUMMY_LOUNGES;

  return (
    <div className="min-h-screen bg-parchment">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Page header */}
        <header className="mb-8 border-b border-charcoal/10 pb-6">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/30">
            BookBound — Community
          </p>
          <h1 className="font-serif text-5xl font-bold text-charcoal">The Reading Room</h1>
        </header>

        <div className="flex gap-12">
          {/* ── Left: Feed (70%) ─────────────────────────── */}
          <main className="min-w-0 flex-[7]">
            {/* Tabs */}
            <FeedTabs activeTab={activeTab} />

            {/* Following tab: not logged in */}
            {activeTab === "following" && !session?.user && (
              <div className="py-16 text-center">
                <p className="font-serif text-xl italic text-charcoal/30">
                  Sign in to see activity from people you follow.
                </p>
                <Link
                  href="/auth/signin"
                  className="mt-6 inline-block rounded-full bg-sage px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sage/20 transition-all hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Following tab: logged in but no follows */}
            {activeTab === "following" && session?.user && feed.length === 0 && (
              <div className="py-16 text-center">
                <p className="font-serif text-xl italic text-charcoal/30">
                  Nothing here yet — follow some readers to see their activity.
                </p>
                <button
                  type="button"
                  onClick={undefined}
                  className="mt-6 inline-block rounded-full border border-charcoal/15 px-8 py-3 text-sm font-semibold text-charcoal/50"
                >
                  Use the search on the right →
                </button>
              </div>
            )}

            {/* Global tab: empty (very unlikely, only if no reviews in DB at all) */}
            {activeTab === "global" && feed.length === 0 && (
              <div className="py-16 text-center">
                <p className="font-serif text-xl italic text-charcoal/30">
                  No activity yet. Be the first to review a book.
                </p>
                <Link
                  href="/search"
                  className="mt-6 inline-block rounded-full bg-sage px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sage/20 transition-all hover:scale-105"
                >
                  Discover Books
                </Link>
              </div>
            )}

            {/* Feed items */}
            {feed.length > 0 && (
              <div>
                {activeTab === "global" && (
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-charcoal/25">
                    Popular · with a few discoveries
                  </p>
                )}
                {feed.map((item, i) => (
                  <div key={item.id}>
                    <FeedCard item={item} />
                    {/* Subtle divider label every ~4 items in global to mark "discoveries" */}
                    {activeTab === "global" && i > 0 && (i + 1) % 4 === 0 && i < feed.length - 1 && (
                      <div className="my-2 flex items-center gap-3">
                        <div className="h-px flex-grow bg-charcoal/5" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-charcoal/20">
                          Discovery
                        </span>
                        <div className="h-px flex-grow bg-charcoal/5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* ── Right: Sidebar (30%) ─────────────────────── */}
          <aside className="hidden w-72 flex-shrink-0 lg:block">
            {/* User Search */}
            <UserSearch currentUserId={session?.user?.id} />

            {/* Divider */}
            <div className="mb-8 border-t border-stone-200" />

            {/* Trending Lounges */}
            <section className="mb-8">
              <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40">
                Trending Lounges
              </h2>
              <div className="space-y-2">
                {sidebarLounges.map((lounge) => (
                  <Link
                    key={lounge.id}
                    href={`/lounge/${lounge.id}`}
                    className="group flex items-start justify-between rounded-xl border border-stone-200 bg-white/50 px-4 py-3 transition-all hover:border-sage/30 hover:bg-sage/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-charcoal group-hover:text-sage transition-colors">
                        {lounge.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-charcoal/40">{lounge.description}</p>
                    </div>
                    <span className="ml-3 flex-shrink-0 rounded-full bg-charcoal/5 px-2.5 py-1 text-[10px] font-bold text-charcoal/40">
                      {lounge.memberCount}
                    </span>
                  </Link>
                ))}

                <Link
                  href="/lounge/new"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-charcoal/15 py-3 text-xs font-medium text-charcoal/40 transition-all hover:border-sage/40 hover:text-sage"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Start a Lounge
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
