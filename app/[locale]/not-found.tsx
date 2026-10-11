import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

/**
 * Localized 404 page shown for every unknown URL under a locale, so a visitor always has a way back.
 * Next.js renders it inside the locale layout when {@link CatchAllPage} calls `notFound()`.
 *
 * @returns The 404 status label, a localized heading and sentence, and one link to the same-locale timer.
 *
 * @example
 * // GET /ja/unknown -> HTTP 404, 「ページが見つかりません」 with 「タイマーに戻る」 linking to /ja
 */
const NotFound = memo(function NotFound() {
  const t = useTranslations('NotFound')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto w-full max-w-md space-y-4 text-center">
        <p className="text-sm text-text-secondary">404</p>
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary">{t('description')}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] rounded-lg border-2 border-bg-secondary bg-bg-primary px-6 py-3 font-semibold text-text-primary shadow-soft transition-colors hover:border-primary-green focus:outline-none focus:ring-2 focus:ring-primary-green"
          >
            {t('backToTimer')}
          </Link>
        </div>
      </div>
    </main>
  )
})

export default NotFound
