import hashUrl from "@/lib/hashUrl";
import prisma from "@/lib/prisma";

export async function createShortUrl(longUrl: string): Promise<string> {
  const hash = hashUrl(longUrl);
  // TODO handle hash collisions
  await prisma.url.create({
    data: {
      longUrl,
      hash: hash,
    },
  });
  return `http://localhost:3000/${hash}`;
}

export async function getLongUrl(hash: string): Promise<string | null> {
  const urlEntry = await prisma.url.findUnique({
    where: { hash },
  });
  return urlEntry ? urlEntry.longUrl : null;
}
