'use client'

import { memo, useState } from 'react'
import { Bell, BellOff, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useSettingsStore } from '@/lib/stores/settingsStore'
import useStore from '@/lib/hooks/useStore'
import { useNotificationSupport } from '@/lib/hooks/useNotificationSupport'
import { useSyncNotificationPermission } from '@/lib/hooks/useSyncNotificationPermission'
import {
  requestNotificationPermission,
  showNotification,
} from '@/lib/notifications/notificationManager'
import { audioManager } from '@/lib/audio/audioManager'

/**
 * NotificationToggle - Shows the browser permission state and app-level on/off state.
 * Users can request permission, toggle notifications, and verify the exact timer-end
 * behavior with a test notification plus the currently selected sound.
 */
export const NotificationToggle = memo(function NotificationToggle() {
  const t = useTranslations('Notifications')
  const { resolvedTheme } = useTheme()
  const notificationState = useStore(useNotificationStore, (state) => state)
  const settingsState = useStore(useSettingsStore, (state) => state)
  const enabled = notificationState?.enabled ?? true
  const permission = notificationState?.permission ?? 'default'
  const setEnabled = notificationState?.setEnabled ?? (() => {})
  const setPermission = notificationState?.setPermission ?? (() => {})
  const soundPreset = settingsState?.soundPreset ?? 'ascending-chime'
  const volume = settingsState?.volume ?? 70
  const supported = useNotificationSupport()
  const [isTesting, setIsTesting] = useState(false)

  const isLiquidGlass = resolvedTheme?.startsWith('liquid-glass') ?? false
  const isActive = enabled && permission === 'granted'

  useSyncNotificationPermission(supported)

  const handleToggle = async () => {
    if (!supported || permission === 'denied') return

    if (isActive) {
      setEnabled(false)
      return
    }

    if (permission === 'granted') {
      setEnabled(true)
      return
    }

    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      setEnabled(true)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      if (soundPreset !== 'none' && volume > 0) {
        try {
          await audioManager.initialize()
          await audioManager.play(soundPreset, volume)
        } catch (error) {
          console.warn('[Notifications] Test sound failed:', error)
        }
      }
      await showNotification({
        title: t('testTitle'),
        body: t('testBody'),
      })
    } finally {
      setIsTesting(false)
    }
  }

  const isBlocked = permission === 'denied'
  const permissionLabel =
    permission === 'granted'
      ? t('browserPermissionGranted')
      : permission === 'denied'
        ? t('browserPermissionDenied')
        : t('browserPermissionDefault')
  const PermissionIcon =
    permission === 'granted'
      ? CheckCircle2
      : permission === 'denied'
        ? XCircle
        : AlertCircle
  const permissionColor =
    permission === 'granted'
      ? 'text-primary-green'
      : permission === 'denied'
        ? 'text-red-500'
        : 'text-amber-500'

  const cardClass = isLiquidGlass
    ? `rounded-xl glass glass-highlight p-4 transition-colors ${isActive ? 'glass-tint-green' : ''}`
    : 'rounded-lg border border-bg-secondary bg-bg-secondary/50 p-4'
  const toggleClass = isLiquidGlass
    ? `relative inline-flex h-7 w-12 shrink-0 items-center rounded-full glass glass-highlight transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green/50 disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'glass-tint-green' : ''}`
    : `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-primary-green' : 'bg-gray-300'}`

  if (!supported) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          {t('title')}
        </label>
        <div className={cardClass}>
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                {t('notSupported')}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t('notSupportedDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        {t('title')}
      </label>

      <div className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {isActive ? (
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary-green" />
            ) : (
              <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                {isActive ? t('enabled') : t('disabled')}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                <PermissionIcon className={`h-3.5 w-3.5 ${permissionColor}`} />
                {t('browserPermission')}: {permissionLabel}
              </p>
              {permission === 'default' && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('permissionDefaultDescription')}
                </p>
              )}
              {isBlocked && (
                <p className="text-xs text-red-500">
                  {t('permissionDeniedHelp')}
                </p>
              )}
            </div>
          </div>

          {isLiquidGlass ? (
            <motion.button
              onClick={handleToggle}
              disabled={isBlocked}
              className={toggleClass}
              role="switch"
              aria-checked={isActive}
              aria-label={t('title')}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className={`inline-block h-5 w-5 rounded-full glass glass-elevated glass-highlight ${isActive ? 'bg-primary-green/20' : ''}`}
                animate={{ x: isActive ? 24 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          ) : (
            <button
              onClick={handleToggle}
              disabled={isBlocked}
              className={toggleClass}
              role="switch"
              aria-checked={isActive}
              aria-label={t('title')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          )}
        </div>

        {permission === 'granted' && (
          <div className="mt-4 border-t border-bg-secondary/60 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {t('testNotification')}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {t('testNotificationDescription')}
                </p>
              </div>
              <button
                type="button"
                data-testid="notification-test-button"
                onClick={handleTest}
                disabled={isTesting}
                className={
                  isLiquidGlass
                    ? 'rounded-xl glass glass-highlight px-4 py-2 text-sm font-semibold text-primary-green transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green/50 disabled:opacity-50'
                    : 'rounded-lg border-2 border-primary-green px-4 py-2 text-sm font-semibold text-primary-green transition-colors hover:bg-primary-green hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 disabled:opacity-50'
                }
              >
                {isTesting ? t('sending') : t('sendTest')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
