import hashUrl from "@/lib/hashUrl";
import prisma from "@/lib/prisma";
import { Prisma } from "../generated/prisma/client";

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~";

/**
 * Creates a hash for the given long URL and returns the shortened URL (${origin}/${hash}).
 *
 * The function creates a hash from the provided longUrl.
 * In case of hash collisions (rare but possible), the functions tries:
 *  - First check if the longUrl exists in the DB and return existing short URL if found (no conflict).
 *  - Otherwise add a random character to the longUrl, rehash it and retries up to 3 times.
 */
export async function createShortUrl(
  origin: string,
  longUrl: string
): Promise<string> {
  let hash = hashUrl(longUrl);
  let attempt = 0;
  let conflict = false; // Track if we've encountered a conflict or the longUrl exists in the DB

  while (attempt < 3) {
    try {
      const newUrl = await prisma.url.create({
        data: {
          longUrl,
          hash,
        },
      });
      return `${origin}/${newUrl.hash}`;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Prisma-specific handling (unique constraint P2002)
        if (error.code === "P2002") {
          if (!conflict) {
            const existing = await prisma.url.findFirst({ where: { longUrl } });
            if (existing) return `${origin}/${existing.hash}`;
          }
          // otherwise handle hash collision
          conflict = true;
          hash = hashUrl(
            longUrl + CHARS[Math.floor(Math.random() * CHARS.length)]
          );
          attempt++;
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error(
    "Failed to create a unique short URL after multiple attempts."
  );
}

export async function getLongUrl(hash: string): Promise<string | null> {
  const urlEntry = await prisma.url.findUnique({
    where: { hash },
  });
  return urlEntry ? urlEntry.longUrl : null;
}
