import { notFound } from 'next/navigation'

/**
 * Catch-all page that sends every unknown URL under a locale to the localized 404.
 * Next.js only renders `app/[locale]/not-found.tsx` when a route calls `notFound()`, so without this
 * page an unknown `/en/...` URL falls through to the root 404, which has no document shell.
 *
 * @returns Never returns: `notFound()` throws to render the nearest not-found boundary.
 * @throws The Next.js not-found signal, handled by `app/[locale]/not-found.tsx`.
 *
 * @example
 * // GET /en/unknown-page -> HTTP 404, "Page not found" with a link back to /en
 */
export default function CatchAllPage(): never {
  notFound()
}
