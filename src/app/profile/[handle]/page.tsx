import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FollowButton } from "./FollowButton";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const session = await auth();

  const profileUser = await db.user.findUnique({
    where: { handle },
    include: {
      shelves: {
        include: { books: { select: { id: true, title: true, thumbnail: true } } },
      },
      reviews: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { book: { select: { id: true, title: true, thumbnail: true, authors: true } } },
      },
      _count: {
        select: {
          followedBy: true,
          following: true,
          shelves: true,
        },
      },
    },
  });

  if (!profileUser) notFound();

  // If viewing own profile, redirect to /profile
  const isOwnProfile = session?.user?.id === profileUser.id;

  // Check if current viewer follows this user
  let viewerFollows = false;
  if (session?.user && !isOwnProfile) {
    const check = await db.user.findUnique({
      where: { id: session.user.id },
      select: { following: { where: { id: profileUser.id }, select: { id: true } } },
    });
    viewerFollows = (check?.following.length ?? 0) > 0;
  }

  // Count total books across all shelves (unique)
  const totalBooks = await db.book.count({
    where: { shelves: { some: { userId: profileUser.id } } },
  });

  return (
    <div className="min-h-screen bg-parchment px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Profile Header */}
        <header className="mb-12 flex flex-col items-center gap-8 md:flex-row md:items-start">
          <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg">
            {profileUser.image ? (
              <Image src={profileUser.image} alt={profileUser.name ?? "User"} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-sage text-4xl font-bold text-white">
                {profileUser.name?.[0] ?? "U"}
              </div>
            )}
          </div>

          <div className="flex-grow text-center md:text-left">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
              <div>
                <h1 className="font-serif text-4xl font-bold text-charcoal">{profileUser.name}</h1>
                <p className="mt-0.5 font-sans text-sage">@{profileUser.handle}</p>
              </div>

              {!isOwnProfile && session?.user && (
                <div className="md:ml-4 md:mt-1">
                  <FollowButton
                    targetUserId={profileUser.id}
                    targetHandle={handle}
                    initialFollowing={viewerFollows}
                  />
                </div>
              )}
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="rounded-full border border-charcoal/15 px-5 py-2 text-sm font-medium text-charcoal/60 transition-all hover:border-charcoal/30 hover:text-charcoal md:ml-4 md:mt-1"
                >
                  Edit Profile
                </Link>
              )}
            </div>

            <div className="mt-5 flex justify-center gap-8 md:justify-start">
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-charcoal">{totalBooks}</span>
                <span className="text-xs uppercase tracking-widest text-charcoal/40">Books</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-charcoal">{profileUser._count.followedBy}</span>
                <span className="text-xs uppercase tracking-widest text-charcoal/40">Followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-charcoal">{profileUser._count.following}</span>
                <span className="text-xs uppercase tracking-widest text-charcoal/40">Following</span>
              </div>
            </div>

            {profileUser.bio && (
              <p className="mt-5 max-w-xl font-sans text-sm leading-relaxed text-charcoal/65">{profileUser.bio}</p>
            )}
          </div>
        </header>

        {/* Shelves */}
        <section className="mb-14">
          <h2 className="mb-6 border-b border-charcoal/10 pb-3 font-serif text-2xl font-bold text-charcoal">
            Shelves
          </h2>
          {profileUser.shelves.length === 0 ? (
            <p className="font-serif italic text-charcoal/35">No public shelves yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {profileUser.shelves.map((shelf) => (
                <Link
                  key={shelf.id}
                  href={`/shelf/${shelf.id}`}
                  className="group rounded-2xl border border-charcoal/8 bg-white/50 p-4 transition-all hover:border-sage/30 hover:shadow-md"
                >
                  {/* Mini book stack */}
                  <div className="mb-3 flex gap-1">
                    {shelf.books.slice(0, 3).map((book) => (
                      <div key={book.id} className="relative h-14 w-10 overflow-hidden rounded shadow-sm">
                        {book.thumbnail ? (
                          <Image src={book.thumbnail} alt={book.title} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full bg-charcoal/10" />
                        )}
                      </div>
                    ))}
                    {shelf.books.length === 0 && (
                      <div className="h-14 w-10 rounded border border-dashed border-charcoal/15" />
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-charcoal group-hover:text-sage transition-colors">
                    {shelf.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal/35">
                    {shelf.books.length} {shelf.books.length === 1 ? "book" : "books"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Reviews */}
        {profileUser.reviews.length > 0 && (
          <section>
            <h2 className="mb-6 border-b border-charcoal/10 pb-3 font-serif text-2xl font-bold text-charcoal">
              Reviews
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {profileUser.reviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/book/${review.book.id}`}
                  className="group flex gap-4 rounded-2xl border border-charcoal/8 bg-white/50 p-4 transition-all hover:border-sage/30 hover:shadow-md"
                >
                  <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded shadow-sm">
                    {review.book.thumbnail ? (
                      <Image src={review.book.thumbnail} alt={review.book.title} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-charcoal/10" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-charcoal group-hover:text-sage transition-colors">
                      {review.book.title}
                    </p>
                    <p className="text-[10px] text-charcoal/40 uppercase tracking-widest">
                      {review.book.authors[0]}
                    </p>
                    <div className="mt-1.5 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} width="10" height="10" viewBox="0 0 24 24"
                          fill={s <= Math.round(review.rating) ? "#8A9A5B" : "none"}
                          stroke="#8A9A5B" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    {review.content && (
                      <p className="mt-1 line-clamp-2 font-serif text-xs italic text-charcoal/55">
                        "{review.content}"
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
