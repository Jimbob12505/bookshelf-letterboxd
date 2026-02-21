import type { PrismaClient } from "../../generated/prisma";

/** Derive a base handle from a display name or email prefix. */
export function generateBaseHandle(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const source = name ?? email?.split("@")[0] ?? "reader";
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // strip anything that isn't alphanumeric
    .slice(0, 20);
  return base || "reader";
}

/** Find a handle that doesn't already exist in the DB. */
export async function makeUniqueHandle(
  db: PrismaClient,
  base: string,
): Promise<string> {
  const existing = await db.user.findUnique({ where: { handle: base } });
  if (!existing) return base;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base.slice(0, 18)}${i}`;
    const taken = await db.user.findUnique({ where: { handle: candidate } });
    if (!taken) return candidate;
  }

  // Random 4-char suffix as last resort
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base.slice(0, 16)}${suffix}`;
}
