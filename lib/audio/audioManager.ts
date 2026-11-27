import type { SoundPreset } from '../stores/settingsStore'

export const SUPPORTED_SOUND_PRESETS = [
  'ascending-chime',
  'bright-ding',
  'double-ping',
  'service-bell',
  'alert-beep',
  'notification-pop',
  'cheerful-chirp',
  'urgent-alert',
  'melodic-bells',
] as const satisfies ReadonlyArray<Exclude<SoundPreset, 'none'>>

const SUPPORTED_SOUND_SET = new Set<SoundPreset>(SUPPORTED_SOUND_PRESETS)

/**
 * AudioManager using Web Audio API for reliable background playback
 *
 * Key improvements over HTMLAudioElement:
 * - AudioContext can be initialized once with user gesture
 * - Background playback works after initialization
 * - Better control over audio playback and timing
 * - Preloading support for instant playback
 */
class AudioManager {
  private audioContext: AudioContext | null = null
  private audioBuffers: Map<SoundPreset, AudioBuffer> = new Map()
  private currentSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private progressCallback:
    ((progress: number, currentTime: number, duration: number) => void) | null =
    null
  private progressInterval: ReturnType<typeof setInterval> | null = null
  private startTime: number = 0
  private duration: number = 0
  private listeners: Set<() => void> = new Set()

  /**
   * Subscribe to AudioContext state changes.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener())
  }

  /**
   * Initialize AudioContext with user gesture (e.g., Start button click)
   * This MUST be called from a user interaction to satisfy browser autoplay policy
   *
   * @returns Promise that resolves when AudioContext is ready
   */
  async initialize(): Promise<void> {
    // Already initialized
    if (this.audioContext && this.audioContext.state !== 'closed') {
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
        this.notifyListeners()
      }
      return
    }

    // Create AudioContext (supports both standard and webkit prefixed)
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) {
      console.error('AudioContext not supported in this browser')
      return
    }

    this.audioContext = new AudioContextClass()
    this.audioContext.onstatechange = () => this.notifyListeners()
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)

    // Resume AudioContext if suspended (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    this.notifyListeners()

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AudioManager] Initialized successfully')
    }
  }

  /**
   * Preload a sound preset into AudioBuffer for instant playback
   *
   * @param preset - The sound preset to preload
   * @returns Promise that resolves when preloading completes
   */
  async preload(preset: SoundPreset): Promise<void> {
    if (preset === 'none') return
    if (!SUPPORTED_SOUND_SET.has(preset)) return

    // Already preloaded
    if (this.audioBuffers.has(preset)) return

    // AudioContext not initialized yet
    if (!this.audioContext) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[AudioManager] Cannot preload - AudioContext not initialized. Call initialize() first.',
        )
      }
      return
    }

    try {
      const response = await fetch(`/sounds/${preset}.mp3`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.audioBuffers.set(preset, audioBuffer)

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AudioManager] Preloaded: ${preset}`)
      }
    } catch (error) {
      console.error(`[AudioManager] Failed to preload sound: ${preset}`, error)
    }
  }

  /**
   * Play a sound preset at the specified volume with optional progress tracking
   *
   * @param preset - The sound preset to play
   * @param volume - Volume level (0-100)
   * @param onProgress - Optional callback for playback progress updates
   */
  async play(
    preset: SoundPreset,
    volume: number,
    onProgress?: (
      progress: number,
      currentTime: number,
      duration: number,
    ) => void,
  ): Promise<void> {
    // Don't play anything if preset is 'none'
    if (preset === 'none') return

    // Skip presets without an available audio file
    if (!SUPPORTED_SOUND_SET.has(preset)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Sound preset "${preset}" is not supported. Skipping playback.`,
        )
      }
      return
    }

    // AudioContext not initialized
    if (!this.audioContext || !this.gainNode) {
      console.warn(
        '[AudioManager] Cannot play - AudioContext not initialized. Call initialize() first.',
      )
      return
    }

    // Resume AudioContext if suspended
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        this.notifyListeners()
      } catch (error) {
        console.error('[AudioManager] Failed to resume AudioContext:', error)
        return
      }
    }

    // Stop any currently playing audio
    this.stop()

    // Store progress callback
    this.progressCallback = onProgress || null

    // Get or load AudioBuffer
    let audioBuffer = this.audioBuffers.get(preset)
    if (!audioBuffer) {
      // Not preloaded - load it now
      await this.preload(preset)
      audioBuffer = this.audioBuffers.get(preset)
    }

    if (!audioBuffer) {
      console.error(`[AudioManager] Failed to load audio buffer: ${preset}`)
      return
    }

    // Create AudioBufferSourceNode
    this.currentSource = this.audioContext.createBufferSource()
    this.currentSource.buffer = audioBuffer
    this.currentSource.connect(this.gainNode)

    // Set volume (0-100 → 0.0-1.0)
    this.gainNode.gain.value = volume / 100

    // Track playback time for progress
    this.startTime = this.audioContext.currentTime
    this.duration = audioBuffer.duration

    // Set up progress tracking if callback provided
    if (this.progressCallback) {
      // Initial progress update
      this.progressCallback(0, 0, this.duration)

      // Update progress every 50ms during playback
      this.progressInterval = setInterval(() => {
        if (this.audioContext && this.currentSource) {
          const elapsed = this.audioContext.currentTime - this.startTime
          const progress = (elapsed / this.duration) * 100

          if (progress >= 100) {
            // Playback complete
            this.handlePlaybackComplete()
          } else {
            this.progressCallback?.(
              Math.min(progress, 100),
              elapsed,
              this.duration,
            )
          }
        }
      }, 50)
    }

    // Handle playback end
    this.currentSource.onended = () => {
      this.handlePlaybackComplete()
    }

    // Start playback
    try {
      this.currentSource.start(0)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AudioManager] Playing: ${preset} at volume ${volume}%`)
      }
    } catch (error) {
      console.error('[AudioManager] Error starting playback:', error)
      this.cleanup()
    }
  }

  /**
   * Handle playback completion
   */
  private handlePlaybackComplete() {
    if (this.progressCallback) {
      this.progressCallback(100, 0, 0)
    }
    this.cleanup()
  }

  /**
   * Stop the currently playing audio
   */
  stop(): void {
    this.cleanup()
  }

  /**
   * Clean up current playback resources
   */
  private cleanup(): void {
    // Clear progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = null
    }

    // Stop and disconnect source node
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch (e) {
        // Already stopped or never started
      }
      this.currentSource.disconnect()
      this.currentSource = null
    }

    this.progressCallback = null
    this.startTime = 0
    this.duration = 0
  }

  /**
   * Get the current AudioContext state
   * Useful for debugging and testing
   */
  getState(): {
    initialized: boolean
    state: AudioContextState | null
    preloadedSounds: SoundPreset[]
  } {
    return {
      initialized: this.audioContext !== null,
      state: this.audioContext?.state || null,
      preloadedSounds: Array.from(this.audioBuffers.keys()),
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager()
