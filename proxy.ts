import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * Next.js 16 proxy (formerly middleware) that handles locale routing for every page request.
 * Next.js calls it for each pathname matched by `config.matcher`, before any route renders.
 *
 * @param request - The incoming request.
 * @returns
 * - A redirect to the locale-prefixed URL when the pathname has no locale
 * - A pass-through response carrying the resolved locale otherwise
 *
 * @example
 * // GET /        -> 307 /en
 * // GET /ja      -> rendered with the `ja` locale
 */
export default createMiddleware(routing)

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/shortcuts`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|shortcuts|_next|_vercel|.*\\..*).*)'],
}
