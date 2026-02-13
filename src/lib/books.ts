import { z } from "zod";

// This type is now defined here, based on the Prisma schema,
// to decouple frontend components from the database layer.
export type Book = {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  pageCount: number | null;
  thumbnail: string | null;
  highResImage: string | null;
  isbn10: string | null;
  isbn13: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const bookSchema = z.object({
  id: z.string(),
  volumeInfo: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
    description: z.string().optional(),
    pageCount: z.number().optional(),
    imageLinks: z
      .object({
        thumbnail: z.string().optional(),
        small: z.string().optional(),
        medium: z.string().optional(),
        large: z.string().optional(),
        smallThumbnail: z.string().optional(),
        extraLarge: z.string().optional(),
      })
      .optional(),
    industryIdentifiers: z
      .array(
        z.object({
          type: z.string(),
          identifier: z.string(),
        })
      )
      .optional(),
  }),
});

const searchSchema = z.object({
  items: z.array(bookSchema),
});

function getIsbn(
  industryIdentifiers:
    | { type: string; identifier: string }[]
    | undefined,
  type: "ISBN_10" | "ISBN_13"
) {
  return industryIdentifiers?.find((i) => i.type === type)?.identifier;
}

export async function searchBooks(query: string): Promise<Book[]> {
  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    throw new Error("GOOGLE_BOOKS_API_KEY is not set");
  }

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);

  const response = await fetch(url);
  const data = await response.json();
  const parsed = searchSchema.parse(data);

  return parsed.items.map((item) => {
    const volumeInfo = item.volumeInfo;
    const imageLinks = volumeInfo.imageLinks;

    // Ensure all image links are HTTPS
    const secureImageLinks = imageLinks
      ? Object.entries(imageLinks).reduce((acc, [key, value]) => {
          if (value) {
            acc[key as keyof typeof imageLinks] = value.replace(
              /^http:/,
              "https:"
            );
          }
          return acc;
        }, {} as typeof imageLinks)
      : {};

    const book: Book = {
      id: item.id,
      title: volumeInfo.title,
      subtitle: volumeInfo.subtitle ?? null,
      authors: volumeInfo.authors ?? [],
      publisher: volumeInfo.publisher ?? null,
      publishedDate: volumeInfo.publishedDate ?? null,
      description: volumeInfo.description ?? null,
      pageCount: volumeInfo.pageCount ?? null,
      thumbnail: secureImageLinks?.thumbnail ?? null,
      highResImage:
        secureImageLinks?.extraLarge ?? secureImageLinks?.large ?? null,
      isbn10: getIsbn(volumeInfo.industryIdentifiers, "ISBN_10") ?? null,
      isbn13: getIsbn(volumeInfo.industryIdentifiers, "ISBN_13") ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return book;
  });
}
