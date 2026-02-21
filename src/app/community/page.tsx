import { auth } from "~/server/auth";
import { db } from "~/server/db";
import Link from "next/link";
import Image from "next/image";
import { FeedCard } from "~/components/community/FeedCard";
import type { FeedItem } from "~/components/community/FeedCard";
import { UserSearch } from "~/components/community/UserSearch";

// ── Dummy data (used when user follows nobody) ───────────────

const DUMMY_FEED: FeedItem[] = [
  {
    type: "review",
    id: "d1",
    user: { name: "Elena Vasquez", handle: "elenavasquez", image: null },
    book: {
      id: "XoFpDQAAQBAJ",
      title: "Dune",
      authors: ["Frank Herbert"],
      thumbnail: "https://books.google.com/books/content?id=XoFpDQAAQBAJ&printsec=frontcover&img=1&zoom=1",
    },
    rating: 5,
    content: "Incredible worldbuilding. The ecology of Arrakis alone is worth the read — Herbert built an entire civilisation around scarcity and faith.",
    vibeTags: ["epic", "political", "world-building"],
    createdAt: new Date(Date.now() - 1000 * 60 * 42),
  },
  {
    type: "shelf",
    id: "d2",
    user: { name: "Marcus Chen", handle: "marcuschen", image: null },
    book: {
      id: "lFkoDwAAQBAJ",
      title: "Verity",
      authors: ["Colleen Hoover"],
      thumbnail: "https://books.google.com/books/content?id=lFkoDwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    },
    shelfName: "Cannot Put Down",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    type: "review",
    id: "d3",
    user: { name: "Sophie Laurent", handle: "sophielaurent", image: null },
    book: {
      id: "eLJRCgAAQBAJ",
      title: "Normal People",
      authors: ["Sally Rooney"],
      thumbnail: "https://books.google.com/books/content?id=eLJRCgAAQBAJ&printsec=frontcover&img=1&zoom=1",
    },
    rating: 4,
    content: "Rooney captures the quiet devastation of being known by someone and still feeling unseen. The prose is restrained in exactly the right way.",
    vibeTags: ["literary", "quiet", "aching"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7),
  },
  {
    type: "shelf",
    id: "d4",
    user: { name: "James Okafor", handle: "jamesokafor", image: null },
    book: {
      id: "sExUIJR1pIsC",
      title: "The Name of the Wind",
      authors: ["Patrick Rothfuss"],
      thumbnail: "https://books.google.com/books/content?id=sExUIJR1pIsC&printsec=frontcover&img=1&zoom=1",
    },
    shelfName: "Reading Now",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 11),
  },
  {
    type: "review",
    id: "d5",
    user: { name: "Amara Osei", handle: "amaraosei", image: null },
    book: {
      id: "eTaODQAAQBAJ",
      title: "Pachinko",
      authors: ["Min Jin Lee"],
      thumbnail: "https://books.google.com/books/content?id=eTaODQAAQBAJ&printsec=frontcover&img=1&zoom=1",
    },
    rating: 5,
    content: "Four generations of a Korean family and not a single wasted word. One of the most humane novels I have ever read.",
    vibeTags: ["multigenerational", "heartbreaking", "essential"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
  },
];

const DUMMY_LOUNGES = [
  { id: "l1", name: "Sci-Fi Salon", description: "Currently reading Hyperion", memberCount: 34 },
  { id: "l2", name: "Dark Academia", description: "Working through The Secret History", memberCount: 21 },
  { id: "l3", name: "Literary Fiction", description: "Discussing Pachinko", memberCount: 18 },
];

const DUMMY_SUGGESTED = [
  { name: "Elena Vasquez", handle: "elenavasquez", image: null, booksRead: 142 },
  { name: "Sophie Laurent", handle: "sophielaurent", image: null, booksRead: 87 },
  { name: "Amara Osei", handle: "amaraosei", image: null, booksRead: 203 },
];

// ── Page ─────────────────────────────────────────────────────

export default async function CommunityPage() {
  const session = await auth();

  // Fetch real feed: public reviews from followed users (or recent global if no follows)
  let feed: FeedItem[] = DUMMY_FEED;

  if (session?.user) {
    const followedUsers = await db.user.findUnique({
      where: { id: session.user.id },
      select: { following: { select: { id: true } } },
    });

    const followedIds = followedUsers?.following.map((u) => u.id) ?? [];

    if (followedIds.length > 0) {
      const reviews = await db.review.findMany({
        where: {
          userId: { in: followedIds },
          isPublic: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { name: true, handle: true, image: true } },
          book: { select: { id: true, title: true, authors: true, thumbnail: true } },
        },
      });

      if (reviews.length > 0) {
        feed = reviews.map((r) => ({
          type: "review" as const,
          id: r.id,
          user: {
            name: r.user.name ?? "Reader",
            handle: r.user.handle ?? r.user.name ?? "reader",
            image: r.user.image,
          },
          book: r.book,
          rating: r.rating,
          content: r.content,
          vibeTags: r.vibeTags,
          createdAt: r.createdAt,
        }));
      }
    }
  }

  // Real lounges
  const lounges = await db.lounge.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="min-h-screen bg-parchment">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Page header */}
        <header className="mb-10 border-b border-charcoal/10 pb-6">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/30">
            BookBound — Community
          </p>
          <h1 className="font-serif text-5xl font-bold text-charcoal">The Reading Room</h1>
          <p className="mt-2 font-sans text-base text-charcoal/50">
            What the people you follow are reading, rating, and shelving.
          </p>
        </header>

        <div className="flex gap-12">
          {/* ── Left: Feed (70%) ─────────────────────────── */}
          <main className="min-w-0 flex-[7]">
            {feed.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl italic text-charcoal/30">
                  Your feed is quiet. Follow some readers to see their activity here.
                </p>
                <Link
                  href="/search"
                  className="mt-6 inline-block rounded-full bg-sage px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sage/20 transition-all hover:scale-105"
                >
                  Discover Books
                </Link>
              </div>
            ) : (
              <div>
                {!session?.user && (
                  <div className="mb-6 rounded-2xl border border-sage/20 bg-sage/5 px-6 py-4">
                    <p className="text-sm text-charcoal/60">
                      <span className="font-semibold text-charcoal">Showing popular activity.</span>{" "}
                      <Link href="/auth/signin" className="text-sage hover:underline">Sign in</Link>{" "}
                      to see a personalised feed from people you follow.
                    </p>
                  </div>
                )}
                <div>
                  {feed.map((item) => (
                    <FeedCard key={item.id} item={item} />
                  ))}
                </div>
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
                {(lounges.length > 0 ? lounges.map((l) => ({
                  id: l.id,
                  name: l.name,
                  description: l.description ?? "",
                  memberCount: l._count.members,
                })) : DUMMY_LOUNGES).map((lounge) => (
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

            {/* Divider */}
            <div className="mb-8 border-t border-stone-200" />

            {/* Suggested Readers */}
            <section>
              <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40">
                Suggested Readers
              </h2>
              <div className="space-y-3">
                {DUMMY_SUGGESTED.map((user) => (
                  <div key={user.handle} className="flex items-center gap-3">
                    <Link href={`/profile/${user.handle}`} className="flex-shrink-0">
                      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-charcoal/10">
                        {user.image ? (
                          <Image src={user.image} alt={user.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-sage/20 text-sm font-bold text-sage">
                            {user.name[0]}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="min-w-0 flex-grow">
                      <Link href={`/profile/${user.handle}`} className="block truncate text-sm font-semibold text-charcoal hover:text-sage transition-colors">
                        {user.name}
                      </Link>
                      <p className="text-[10px] text-charcoal/35">{user.booksRead} books read</p>
                    </div>
                    <button
                      type="button"
                      className="flex-shrink-0 rounded-full border border-charcoal/15 px-3 py-1 text-[11px] font-semibold text-charcoal/60 transition-all hover:border-sage hover:bg-sage/5 hover:text-sage"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
