/**
 * Handles an HTTP POST request to create a shortened URL.
 *
 * Expects the request body to be JSON with a `longUrl` string property.
 * and returns a JSON response containing the `shortUrl`.
 *
 * @remarks
 * - Request body shape: { longUrl: string }
 * - Response body shape: { shortUrl: string }
 * - Response header: "Content-Type: application/json"
 *
 * @param request - The incoming Request object containing a JSON body.
 * @returns A Promise that resolves to a Response with a JSON payload containing the shortened URL.
 *
 * @example
 * // Request body:
 * // { "longUrl": "https://example.com/some/long/path" }
 *
 * // Response body:
 * // { "shortUrl": "https://short.url/ABCDEF" }
 */

export async function POST(request: Request) {
  const { longUrl } = await request.json();
  console.log("Received URL to shorten:", longUrl);
  // Simulate URL shortening
  const shortUrl = `https://short.url/ABCDEF`;
  return new Response(JSON.stringify({ shortUrl }), {
    headers: { "Content-Type": "application/json" },
  });
}
