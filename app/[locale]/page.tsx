'use client'

import { useState, memo, useCallback, Suspense } from 'react'
import { Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTimerStore } from '@/lib/stores/timerStore'
import { useSettingsStore } from '@/lib/stores/settingsStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import useStore from '@/lib/hooks/useStore'
import { audioManager } from '@/lib/audio/audioManager'
import { useShortcutHandler } from '@/lib/hooks/useShortcutHandler'
import { useTimerSetTimeTracker } from '@/lib/hooks/useTimerSetTimeTracker'
import { useSoundPreloader } from '@/lib/hooks/useSoundPreloader'
import { useTimerTick } from '@/lib/hooks/useTimerTick'
import { usePageVisibility } from '@/lib/hooks/usePageVisibility'
import { useTimerCompletion } from '@/lib/hooks/useTimerCompletion'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerControls } from '@/components/timer/TimerControls'
import { TimeInput } from '@/components/timer/TimeInput'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ServiceWorkerRegistration } from '@/components/notifications/ServiceWorkerRegistration'
import { NotificationTest } from '@/components/notifications/NotificationTest'

/**
 * Component to handle PWA shortcut actions from URL parameters.
 * Wrapped in Suspense for SSG compatibility.
 */
const ShortcutHandler = memo(function ShortcutHandler({
  onStartTimer,
  onOpenSettings,
  isHydrated,
}: {
  onStartTimer: () => void
  onOpenSettings: () => void
  isHydrated: boolean
}) {
  useShortcutHandler(onStartTimer, onOpenSettings, isHydrated)
  return null
})

const Home = memo(function Home() {
  const t = useTranslations('App')
  const tSettings = useTranslations('Settings')
  const tNotifications = useTranslations('Notifications')
  // Use hydration-safe hook to prevent SSR mismatches
  const timerState = useStore(useTimerStore, (state) => state)
  const settingsState = useStore(useSettingsStore, (state) => state)
  const notificationState = useStore(useNotificationStore, (state) => state)

  // Provide defaults during hydration
  const timeRemaining = timerState?.timeRemaining ?? 300
  const initialTime = timerState?.initialTime ?? 300
  const isRunning = timerState?.isRunning ?? false
  const isPaused = timerState?.isPaused ?? false
  const setTime = timerState?.setTime ?? (() => {})
  const start = timerState?.start ?? (() => {})
  const pause = timerState?.pause ?? (() => {})
  const reset = timerState?.reset ?? (() => {})
  const soundPreset = settingsState?.soundPreset ?? 'ascending-chime'
  const volume = settingsState?.volume ?? 70

  const notificationsEnabled = notificationState?.enabled ?? true
  const permission = notificationState?.permission ?? 'default'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Custom hooks for timer logic
  const userSetTimeRef = useTimerSetTimeTracker(initialTime, isRunning)
  useSoundPreloader(soundPreset)
  useTimerTick(isRunning)
  usePageVisibility()
  useTimerCompletion(
    timeRemaining,
    soundPreset,
    volume,
    notificationsEnabled,
    permission,
    userSetTimeRef,
    tNotifications('timerCompleteTitle'),
    tNotifications('timerCompleteBody'),
  )

  /** Starts a PWA shortcut timer synchronously because ShortcutHandler has no gesture to unlock Web Audio. @returns Nothing; the timer store is updated immediately. @example handleStartFromShortcut() */
  const handleStartFromShortcut = useCallback(() => {
    useTimerStore.getState().start()
  }, [])

  // Open settings callback for PWA shortcut (memoized for ShortcutHandler)
  const handleOpenSettingsForShortcut = useCallback(() => {
    setIsSettingsOpen(true)
  }, [])

  // Close settings callback
  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false)
  }, [])

  // Initialize AudioContext and preload sound on timer start (user interaction)
  const handleStart = useCallback(async () => {
    // Initialize AudioContext (satisfies browser autoplay policy)
    await audioManager.initialize()

    // Preload current sound preset for instant playback
    const currentPreset = useSettingsStore.getState().soundPreset
    if (currentPreset !== 'none') {
      await audioManager.preload(currentPreset)
    }

    // Start the timer
    useTimerStore.getState().start()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 p-8">
      {/* Service Worker Registration - runs once on mount */}
      <ServiceWorkerRegistration />

      {/* PWA Shortcut Handler - wrapped in Suspense for SSG compatibility */}
      <Suspense fallback={null}>
        <ShortcutHandler
          onStartTimer={handleStartFromShortcut}
          onOpenSettings={handleOpenSettingsForShortcut}
          isHydrated={timerState !== null}
        />
      </Suspense>

      <div className="mx-auto w-full max-w-2xl space-y-12">
        {/* Header with Language and Settings */}
        <div className="space-y-2">
          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Language Toggle - Left Side */}
            <LanguageToggle />

            {/* Settings - Right Side */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full p-3 min-w-11 min-h-11 flex items-center justify-center text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-green cursor-pointer"
              aria-label={tSettings('openSettings')}
            >
              <Settings className="h-6 w-6" />
            </button>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-text-primary">
              {t('title')}
            </h1>
            <p className="mt-2 text-text-secondary">{t('description')}</p>
          </div>
        </div>

        {/* Timer Display */}
        <TimerDisplay
          timeRemaining={timeRemaining}
          isRunning={isRunning}
          isPaused={isPaused}
          initialTime={initialTime}
        />

        {/* Timer Controls */}
        <TimerControls
          onStart={handleStart}
          onPause={pause}
          onReset={reset}
          isRunning={isRunning}
        />

        {/* Time Input */}
        <TimeInput
          onTimeChange={setTime}
          disabled={isRunning}
          initialMinutes={Math.floor(initialTime / 60)}
          initialSeconds={initialTime % 60}
        />

        {/* Notification Test - Development/Testing UI */}
        <div className="mt-8 border-t border-bg-secondary pt-8">
          <NotificationTest />
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </main>
  )
})

export default Home
