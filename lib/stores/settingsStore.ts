import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type SoundPreset =
  | 'bright-ding'
  | 'double-ping'
  | 'service-bell'
  | 'alert-beep'
  | 'ascending-chime'
  | 'notification-pop'
  | 'cheerful-chirp'
  | 'urgent-alert'
  | 'melodic-bells'
  | 'none'

interface SettingsState {
  // State
  soundPreset: SoundPreset
  lastAudibleSoundPreset: Exclude<SoundPreset, 'none'>
  volume: number // 0-100

  // Actions
  setSoundPreset: (preset: SoundPreset) => void
  setSoundEnabled: (enabled: boolean) => void
  setVolume: (volume: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      soundPreset: 'ascending-chime',
      lastAudibleSoundPreset: 'ascending-chime',
      volume: 70,

      // Actions
      setSoundPreset: (preset: SoundPreset) => {
        set((state) => ({
          soundPreset: preset,
          lastAudibleSoundPreset:
            preset === 'none'
              ? state.soundPreset === 'none'
                ? state.lastAudibleSoundPreset
                : state.soundPreset
              : preset,
        }))
      },

      setSoundEnabled: (enabled: boolean) => {
        set((state) => {
          if (enabled) {
            return { soundPreset: state.lastAudibleSoundPreset }
          }

          return {
            soundPreset: 'none',
            lastAudibleSoundPreset:
              state.soundPreset === 'none'
                ? state.lastAudibleSoundPreset
                : state.soundPreset,
          }
        })
      },

      setVolume: (volume: number) => {
        // Clamp volume between 0-100
        const clampedVolume = Math.max(0, Math.min(100, volume))
        set({ volume: clampedVolume })
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
