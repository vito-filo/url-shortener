/**
 * Handles an HTTP GET request to retrieve the original URL for a given hash.
 *
 * Expects the request URL to contain a hash parameter.
 * Redirect the user to the original URL associated with the hash.
 * The request is mapped to the path /api/[hash] using rewrites (check next.config.js).
 *
 */
import { NextRequest, NextResponse } from "next/server";
import { getLongUrl } from "../urlService";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ hash: string }> }
) {
  const { hash } = await context.params;
  const longUrl = await getLongUrl(hash);
  if (longUrl) {
    return NextResponse.redirect(longUrl);
  } else {
    return NextResponse.json({ error: "URL not found" }, { status: 404 });
  }
}
