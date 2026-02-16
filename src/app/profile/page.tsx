import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { db } from "~/server/db";
import { CreateShelfModal } from "~/components/CreateShelfModal";
import { ShelfCard } from "~/components/ShelfCard";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      shelves: {
        include: {
          books: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Profile Header */}
        <header className="mb-12 flex flex-col items-center gap-8 md:flex-row md:items-start">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-tactile">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-sage text-4xl text-white">
                {user.name?.[0] ?? "U"}
              </div>
            )}
          </div>

          <div className="flex-grow text-center md:text-left">
            <h1 className="font-serif text-4xl font-bold text-charcoal">
              {user.name}
            </h1>
            <p className="font-sans text-sage">@{user.handle ?? "bookworm"}</p>
            
            <div className="mt-4 flex justify-center gap-8 md:justify-start">
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-charcoal">0</span>
                <span className="text-xs uppercase tracking-widest text-charcoal/40">Books</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-charcoal">0</span>
                <span className="text-xs uppercase tracking-widest text-charcoal/40">Followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-charcoal">0</span>
                <span className="text-xs uppercase tracking-widest text-charcoal/40">Following</span>
              </div>
            </div>

            <p className="mt-6 max-w-xl font-sans text-charcoal/70">
              {user.bio ?? "No bio yet. Start your journey by adding one!"}
            </p>
          </div>
        </header>

        {/* Shelves Section */}
        <section>
          <div className="mb-8 flex items-center justify-between border-b border-charcoal/10 pb-4">
            <h2 className="font-serif text-2xl font-bold text-charcoal">My Shelves</h2>
            <CreateShelfModal />
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {user.shelves.length > 0 ? (
              user.shelves.map((shelf) => (
                <ShelfCard key={shelf.id} shelf={shelf} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="mx-auto mb-4 h-20 w-20 opacity-10">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="font-serif text-charcoal/40 italic">Your library is currently empty.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
