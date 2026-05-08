import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { detectBeats } from '../../utils/beat-detection'

export function AudioWaveform() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const { 
    audio, 
    beatData, 
    setBeatData, 
    pixelsPerSecond, 
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying
  } = useProjectStore()

  const [loading, setLoading] = useState(false)

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(74, 158, 255, 0.5)',
      progressColor: 'rgba(233, 69, 96, 0.8)',
      cursorColor: 'transparent', // We use our own playhead
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      minPxPerSec: pixelsPerSecond,
      interact: false // We handle interaction in Timeline
    })

    wavesurferRef.current = ws

    return () => {
      ws.destroy()
    }
  }, [])

  // Sync zoom
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(pixelsPerSecond)
    }
  }, [pixelsPerSecond])

  // Load audio and detect beats
  useEffect(() => {
    const loadAudio = async () => {
      if (!audio || !wavesurferRef.current) {
        wavesurferRef.current?.empty()
        setBeatData(null)
        return
      }

      setLoading(true)
      try {
        // We use base64 data URL to load local file in renderer
        const dataUrl = await (window as any).api.readFileAsBase64(audio.path)
        
        await wavesurferRef.current.load(dataUrl)
        
        // Detect beats
        const beats = await detectBeats(dataUrl)
        setBeatData(beats)
      } catch (e) {
        console.error('Failed to load audio or detect beats:', e)
      } finally {
        setLoading(false)
      }
    }

    loadAudio()
  }, [audio, setBeatData])

  // Sync playback position from store
  useEffect(() => {
    if (wavesurferRef.current && wavesurferRef.current.getDuration() > 0) {
      // Seek wavesurfer without playing
      const duration = wavesurferRef.current.getDuration()
      if (duration > 0) {
        const timeToSeek = Math.min(currentTime, duration)
        // wavesurfer.seekTo expects a value between 0 and 1
        wavesurferRef.current.seekTo(timeToSeek / duration)
      }
    }
  }, [currentTime])

  if (!audio) {
    return (
      <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
        {t('timeline.noAudio', 'No audio track')}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '60px', width: '100%' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 10, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
          <span className="animate-pulse">{t('common.loading')} Analyzing beats...</span>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
