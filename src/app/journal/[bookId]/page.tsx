import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { getBook } from "~/lib/books";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { saveJournalEntry } from "~/server/actions";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { bookId } = await params;
  const book = await getBook(bookId);
  if (!book) notFound();

  const entries = await db.journalEntry.findMany({
    where: { bookId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col lg:flex-row">
      {/* Left: The Book Side */}
      <div className="flex flex-col items-center justify-center border-r border-charcoal/5 bg-charcoal/5 p-12 lg:w-1/3">
        <div className="relative mb-8 aspect-[2/3] w-full max-w-[300px] overflow-hidden rounded-r-2xl rounded-l-md shadow-2xl">
          {book.thumbnail ? (
            <Image
              src={book.highResImage || book.thumbnail}
              alt={book.title}
              fill
              className="object-cover"
            />
          ) : null}
          <div className="absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-black/20 to-transparent" />
        </div>
        <h2 className="text-center font-serif text-2xl font-bold text-charcoal">
          {book.title}
        </h2>
        <p className="mb-8 font-sans text-charcoal/60">
          {book.authors.join(", ")}
        </p>
        <button className="rounded-full bg-sage px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-sage/90 active:scale-95">
          Finish Reading
        </button>
      </div>

      {/* Right: The Notebook Side */}
      <div className="bg-parchment p-12 lg:flex-grow">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 flex items-center gap-8 border-b border-charcoal/10 pb-4">
            <button className="relative font-serif text-xl font-bold text-charcoal">
              Notes
              <div className="absolute -bottom-4.5 left-0 h-1 w-full bg-sage" />
            </button>
            <button className="font-serif text-xl font-medium text-charcoal/40 transition-colors hover:text-charcoal">
              Review
            </button>
            <button className="font-serif text-xl font-medium text-charcoal/40 transition-colors hover:text-charcoal">
              Quotes
            </button>
          </div>

          {/* Note Input */}
          <form
            action={async (formData: FormData) => {
              "use server";
              const content = formData.get("content") as string;
              const page = formData.get("page") ? Number(formData.get("page")) : undefined;
              if (content) {
                await saveJournalEntry(bookId, content, page);
              }
            }}
            className="mb-12 rounded-xl bg-white p-8 shadow-tactile"
            style={{
              backgroundImage: "repeating-linear-gradient(#fff, #fff 31px, #e5e7eb 31px, #e5e7eb 32px)",
              backgroundSize: "100% 32px",
              lineHeight: "32px",
            }}
          >
            <div className="mb-4 flex items-center justify-between border-b border-charcoal/5 pb-2">
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-charcoal/40">
                New Note
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-charcoal/40">Page</span>
                <input
                  name="page"
                  type="number"
                  placeholder="0"
                  className="w-16 border-b border-charcoal/20 bg-transparent text-center text-sm font-bold outline-none focus:border-sage"
                />
              </div>
            </div>
            <textarea
              name="content"
              placeholder="What are your thoughts?"
              className="min-h-[200px] w-full resize-none bg-transparent font-serif text-lg text-charcoal focus:outline-none"
              style={{ lineHeight: "32px", paddingTop: "0px" }}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-sage px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sage/90"
              >
                Save Reflection
              </button>
            </div>
          </form>

          {/* Entry List */}
          <div className="space-y-8">
            {entries.map((entry) => (
              <div key={entry.id} className="group relative">
                <div className="mb-2 flex items-center gap-4">
                  <span className="font-sans text-xs font-bold text-sage">
                    {entry.page ? `PG. ${entry.page}` : "THOUGHT"}
                  </span>
                  <span className="h-px flex-grow bg-charcoal/5" />
                  <span className="font-sans text-xs text-charcoal/20">
                    {entry.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <p className="font-serif text-lg leading-relaxed text-charcoal/80">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
