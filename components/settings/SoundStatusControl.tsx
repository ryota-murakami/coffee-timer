'use client'

import { memo, useState, useSyncExternalStore } from 'react'
import { Play, Volume2, VolumeX } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSettingsStore } from '@/lib/stores/settingsStore'
import useStore from '@/lib/hooks/useStore'
import { audioManager } from '@/lib/audio/audioManager'

const subscribeToAudioState = (listener: () => void) =>
  audioManager.subscribe(listener)
const getAudioState = () => audioManager.getState().state
const getServerAudioState = () => null

/**
 * SoundStatusControl - Shows whether timer sounds are enabled, whether Web Audio is
 * ready in this browser, and lets users verify playback with one click.
 */
export const SoundStatusControl = memo(function SoundStatusControl() {
  const t = useTranslations('Settings')
  const { resolvedTheme } = useTheme()
  const settingsState = useStore(useSettingsStore, (state) => state)
  const soundPreset = settingsState?.soundPreset ?? 'ascending-chime'
  const volume = settingsState?.volume ?? 70
  const setSoundEnabled = settingsState?.setSoundEnabled ?? (() => {})
  const audioState = useSyncExternalStore(
    subscribeToAudioState,
    getAudioState,
    getServerAudioState,
  )
  const [isTesting, setIsTesting] = useState(false)

  const isLiquidGlass = resolvedTheme?.startsWith('liquid-glass') ?? false
  const soundEnabled = soundPreset !== 'none'
  const canTest = soundEnabled && volume > 0
  const audioReady = audioState === 'running'

  const handleTest = async () => {
    if (!canTest) return

    setIsTesting(true)
    try {
      await audioManager.initialize()
      await audioManager.play(soundPreset, volume)
    } finally {
      setIsTesting(false)
    }
  }

  const cardClass = isLiquidGlass
    ? `rounded-xl glass glass-highlight p-4 transition-colors ${soundEnabled ? 'glass-tint-green' : ''}`
    : 'rounded-lg border border-bg-secondary bg-bg-secondary/50 p-4'
  const toggleClass = isLiquidGlass
    ? `relative inline-flex h-7 w-12 shrink-0 items-center rounded-full glass glass-highlight transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green/50 ${soundEnabled ? 'glass-tint-green' : ''}`
    : `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 ${soundEnabled ? 'bg-primary-green' : 'bg-gray-300'}`

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        {t('soundStatus')}
      </label>

      <div className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {soundEnabled ? (
              <Volume2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-green" />
            ) : (
              <VolumeX className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                {soundEnabled ? t('soundEnabled') : t('soundDisabled')}
              </p>
              <p className="text-xs text-text-secondary">
                {t('browserAudio')}:{' '}
                {audioReady ? t('audioReady') : t('audioNeedsInteraction')}
              </p>
              {!audioReady && soundEnabled && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('audioNeedsInteractionDescription')}
                </p>
              )}
              {audioReady && soundEnabled && (
                <p className="text-xs text-text-secondary">
                  {t('audioReadyDescription')}
                </p>
              )}
              {!soundEnabled && (
                <p className="text-xs text-text-secondary">
                  {t('soundOffDescription')}
                </p>
              )}
              {soundEnabled && volume === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('soundVolumeZeroDescription')}
                </p>
              )}
            </div>
          </div>

          {isLiquidGlass ? (
            <motion.button
              type="button"
              data-testid="sound-enabled-toggle"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={toggleClass}
              role="switch"
              aria-checked={soundEnabled}
              aria-label={t('soundStatus')}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className={`inline-block h-5 w-5 rounded-full glass glass-elevated glass-highlight ${soundEnabled ? 'bg-primary-green/20' : ''}`}
                animate={{ x: soundEnabled ? 24 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          ) : (
            <button
              type="button"
              data-testid="sound-enabled-toggle"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={toggleClass}
              role="switch"
              aria-checked={soundEnabled}
              aria-label={t('soundStatus')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          )}
        </div>

        <div className="mt-4 border-t border-bg-secondary/60 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {t('testSound')}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t('testSoundDescription')}
              </p>
            </div>
            <button
              type="button"
              data-testid="sound-test-button"
              onClick={handleTest}
              disabled={!canTest || isTesting}
              className={
                isLiquidGlass
                  ? 'inline-flex items-center gap-2 rounded-xl glass glass-highlight px-4 py-2 text-sm font-semibold text-primary-green transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green/50 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'inline-flex items-center gap-2 rounded-lg border-2 border-primary-green px-4 py-2 text-sm font-semibold text-primary-green transition-colors hover:bg-primary-green hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              }
            >
              <Play className="h-4 w-4 fill-current" />
              {isTesting ? t('testingSound') : t('testSoundButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
