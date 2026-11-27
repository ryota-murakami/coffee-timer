'use client'

import { memo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSettingsStore } from '@/lib/stores/settingsStore'
import useStore from '@/lib/hooks/useStore'
import { SoundSelector } from './SoundSelector'
import { VolumeControl } from './VolumeControl'
import { NotificationToggle } from './NotificationToggle'
import { SoundStatusControl } from './SoundStatusControl'
import { ThemeSelector } from './ThemeSelector'
import { GlassButton } from '@/components/ui/GlassPanel'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * SettingsPanel - Theme-aware settings dialog
 *
 * For Liquid Glass themes:
 * - Translucent glass overlay with backdrop blur
 * - Glass container with elevated shadow
 * - Specular highlights for depth
 * - Smooth spring animations
 *
 * For original themes (light/dark/coffee):
 * - Standard modal appearance
 * - Maintains original visual appearance
 */
export const SettingsPanel = memo(function SettingsPanel({
  isOpen,
  onClose,
}: SettingsPanelProps) {
  const t = useTranslations('Settings')
  const { resolvedTheme } = useTheme()
  const settingsState = useStore(useSettingsStore, (state) => state)
  const soundPreset = settingsState?.soundPreset ?? 'ascending-chime'
  const volume = settingsState?.volume ?? 70
  const setSoundPreset = settingsState?.setSoundPreset ?? (() => {})
  const setVolume = settingsState?.setVolume ?? (() => {})

  // Check if current theme is a liquid-glass variant
  const isLiquidGlass = resolvedTheme?.startsWith('liquid-glass') ?? false

  // For original themes: render standard dialog
  if (!isLiquidGlass) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            data-testid="settings-panel"
            className="fixed left-[50%] top-[50%] flex max-h-[85vh] w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg bg-bg-primary shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <Dialog.Title className="text-2xl font-bold text-text-primary">
                {t('title')}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  data-testid="settings-close-button"
                  className="rounded-full p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-green"
                  aria-label={t('close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Settings Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-6">
                <ThemeSelector />
                <NotificationToggle />
                <SoundStatusControl />
                <SoundSelector value={soundPreset} onChange={setSoundPreset} />
                <VolumeControl value={volume} onChange={setVolume} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 pt-4 pb-6">
              <Dialog.Close asChild>
                <button
                  data-testid="settings-done-button"
                  className="rounded-lg bg-primary-green px-6 py-3 min-h-[44px] font-semibold text-white shadow-soft transition-colors hover:bg-primary-green-dark focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2"
                >
                  {t('done')}
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  // For Liquid Glass themes: render glass dialog
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Glass Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            {/* Glass Dialog Content - Flexbox centering wrapper */}
            <Dialog.Content asChild>
              <div
                className="fixed inset-0 flex items-center justify-center p-4"
                onClick={onClose}
              >
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  data-testid="settings-panel"
                  className="flex max-h-[85vh] w-[90vw] max-w-md flex-col overflow-hidden rounded-3xl glass glass-elevated glass-highlight focus:outline-none"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <Dialog.Title className="text-2xl font-bold text-text-primary">
                      {t('title')}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <motion.button
                        data-testid="settings-close-button"
                        className="rounded-full p-3 min-w-[44px] min-h-[44px] flex items-center justify-center glass glass-highlight text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-green/50"
                        aria-label={t('close')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <X className="h-5 w-5" />
                      </motion.button>
                    </Dialog.Close>
                  </div>

                  {/* Settings Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto px-6">
                    <div className="space-y-6">
                      <ThemeSelector />
                      <NotificationToggle />
                      <SoundStatusControl />
                      <SoundSelector
                        value={soundPreset}
                        onChange={setSoundPreset}
                      />
                      <VolumeControl value={volume} onChange={setVolume} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end px-6 pt-4 pb-6">
                    <Dialog.Close asChild>
                      <GlassButton
                        data-testid="settings-done-button"
                        tint="green"
                        className="px-6 py-3 min-h-[44px] font-semibold text-primary-green"
                      >
                        {t('done')}
                      </GlassButton>
                    </Dialog.Close>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
})
