import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const after = request.nextUrl.searchParams.get("after") ?? "";

  const messages = await db.loungeMessage.findMany({
    where: {
      loungeId: id,
      ...(after ? { id: { gt: after } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: { name: true, handle: true, image: true } } },
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      text: m.text,
      createdAt: m.createdAt,
      user: { name: m.user.name ?? "Reader", handle: m.user.handle ?? "", image: m.user.image },
    })),
  );
}
