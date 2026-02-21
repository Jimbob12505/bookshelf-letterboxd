import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LoungeChat } from "./LoungeChat";

export default async function LoungePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const lounge = await db.lounge.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, handle: true, image: true } },
      currentBook: { select: { id: true, title: true, authors: true, thumbnail: true } },
      _count: { select: { members: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
        include: { user: { select: { name: true, handle: true, image: true } } },
      },
    },
  });

  if (!lounge) notFound();

  // Check membership
  const membership = await db.loungeMembership.findUnique({
    where: { userId_loungeId: { userId: session.user.id, loungeId: id } },
  });

  const isMember = !!membership || lounge.creator.handle === session.user.id;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col bg-parchment">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="border-b border-charcoal/8 bg-white/60 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/community"
              className="text-charcoal/40 transition-colors hover:text-charcoal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="font-serif text-xl font-bold text-charcoal">{lounge.name}</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-charcoal/35">
                {lounge._count.members} {lounge._count.members === 1 ? "member" : "members"}
                {lounge.creator.name && ` · hosted by ${lounge.creator.name}`}
              </p>
            </div>
          </div>

          {/* Current book */}
          {lounge.currentBook && (
            <Link
              href={`/book/${lounge.currentBook.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-charcoal/8 bg-parchment px-4 py-2.5 transition-all hover:border-sage/30"
            >
              <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded shadow-sm">
                {lounge.currentBook.thumbnail ? (
                  <Image
                    src={lounge.currentBook.thumbnail}
                    alt={lounge.currentBook.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-charcoal/10" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/35">Now Reading</p>
                <p className="text-sm font-semibold text-charcoal group-hover:text-sage transition-colors">
                  {lounge.currentBook.title}
                </p>
                {lounge.currentBook.authors[0] && (
                  <p className="text-[10px] text-charcoal/40">{lounge.currentBook.authors[0]}</p>
                )}
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* ── Chat ─────────────────────────────────────────────── */}
      <LoungeChat
        loungeId={id}
        initialMessages={lounge.messages.map((m) => ({
          id: m.id,
          text: m.text,
          createdAt: m.createdAt,
          user: {
            name: m.user.name ?? "Reader",
            handle: m.user.handle ?? "",
            image: m.user.image,
          },
        }))}
        currentUser={{
          id: session.user.id,
          name: session.user.name ?? "Reader",
          image: session.user.image ?? null,
        }}
        isMember={isMember}
      />
    </div>
  );
}
