import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { detectBeats } from '../../utils/beat-detection'

export function AudioWaveform() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
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

  const [status, setStatus] = useState<string>('Idle')
  const [loading, setLoading] = useState(false)
  const [isAudioLoaded, setIsAudioLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSrc, setCurrentSrc] = useState<string>('')

  // Consolidated initialization and loading
  useEffect(() => {
    if (!containerRef.current || !audio) {
      setStatus(audio ? 'Initializing...' : 'No audio')
      return
    }

    let isMounted = true
    let ws: WaveSurfer | null = null

    const initAndLoad = async () => {
      setLoading(true)
      setStatus('Loading audio file...')
      setError(null)

      try {
        // 1. Initialize WaveSurfer with the native audio element
        const wsInstance = WaveSurfer.create({
          container: containerRef.current!,
          media: audioRef.current!, // This is the secret sauce!
          waveColor: '#7c3aed',
          progressColor: '#a78bfa',
          cursorColor: 'transparent',
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 60,
          minPxPerSec: pixelsPerSecond,
          interact: false
        })

        ws = wsInstance

        wsInstance.on('ready', () => {
          if (isMounted) {
            setIsAudioLoaded(true)
            if (audioRef.current) {
              audioRef.current.volume = 1
              audioRef.current.muted = false
            }
            setStatus('Ready')
          }
        })

        wavesurferRef.current = ws

        // 2. Load Data
        const dataUrl = await (window as any).api.readDataUrl(audio.path)
        if (!isMounted) return
        
        setCurrentSrc(dataUrl)
        setStatus('Decoding audio...')
        await ws.load(dataUrl)
        
        setStatus('Analyzing beats...')
        const beats = await detectBeats(dataUrl)
        if (isMounted) {
          setBeatData(beats)
          setLoading(false)
        }
      } catch (e: any) {
        console.error('Waveform Error:', e)
        if (isMounted) {
          setError(e.message || 'Failed to load audio')
          setLoading(false)
          setStatus('Error')
        }
      }
    }

    initAndLoad()

    return () => {
      isMounted = false
      ws?.destroy()
    }
  }, [audio, setBeatData]) // Only re-run when audio file changes

  // Sync zoom
  useEffect(() => {
    if (isAudioLoaded && wavesurferRef.current) {
      wavesurferRef.current.zoom(pixelsPerSecond)
    }
  }, [pixelsPerSecond, isAudioLoaded])

  // Playback control
  useEffect(() => {
    if (!wavesurferRef.current || !isAudioLoaded || !audioRef.current) return
    
    if (isPlaying) {
      // Use both for double assurance
      audioRef.current.play().catch(console.error)
      wavesurferRef.current.play().catch(console.error)
    } else {
      audioRef.current.pause()
      wavesurferRef.current.pause()
    }
  }, [isPlaying, isAudioLoaded])

  // Seek sync
  useEffect(() => {
    if (wavesurferRef.current && isAudioLoaded && !isPlaying) {
      const wsTime = wavesurferRef.current.getCurrentTime()
      if (Math.abs(wsTime - currentTime) > 0.1) {
        wavesurferRef.current.setTime(currentTime)
      }
    }
  }, [currentTime, isAudioLoaded, isPlaying])

  // Global playback control
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws || !isAudioLoaded) return

    const handleGlobalPlay = () => {
      if (audioRef.current) {
        audioRef.current.muted = false
        audioRef.current.volume = 1
        audioRef.current.play().catch(console.error)
      }
      ws.play().catch(console.error)
    }

    const handleGlobalPause = () => {
      audioRef.current?.pause()
      ws.pause()
    }

    window.addEventListener('app-play', handleGlobalPlay)
    window.addEventListener('app-pause', handleGlobalPause)
    
    return () => {
      window.removeEventListener('app-play', handleGlobalPlay)
      window.removeEventListener('app-pause', handleGlobalPause)
    }
  }, [isAudioLoaded])

  // Time tracking
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws || !isAudioLoaded) return

    const onTimeUpdate = () => {
      const time = ws.getCurrentTime()
      setCurrentTime(time)
    }
    
    const onFinish = () => { 
      setIsPlaying(false)
      setCurrentTime(0) 
    }

    ws.on('timeupdate', onTimeUpdate)
    ws.on('finish', onFinish)
    
    return () => {
      ws.un('timeupdate', onTimeUpdate)
      ws.un('finish', onFinish)
    }
  }, [isAudioLoaded, setCurrentTime, setIsPlaying])

  // Sync initial play state
  useEffect(() => {
    if (isAudioLoaded && isPlaying) {
      window.dispatchEvent(new CustomEvent('app-play'))
    }
  }, [isAudioLoaded])

  if (!audio) {
    return (
      <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-xs)' }}>
        {t('timeline.noAudio', 'No audio track')}
      </div>
    )
  }

  const handleInteraction = () => {
    if (audioRef.current) {
      audioRef.current.muted = false
      audioRef.current.volume = 1
    }
    if (wavesurferRef.current) {
      const ctx = (wavesurferRef.current as any).getAudioContext?.()
      if (ctx) ctx.resume()
      if (isPlaying) {
        wavesurferRef.current.play().catch(console.error)
      }
    }
  }

  return (
    <div 
      style={{ position: 'relative', height: '60px', width: '100%', background: 'rgba(0,0,0,0.15)', cursor: 'pointer', overflow: 'hidden' }}
      onClick={handleInteraction}
    >
      {/* Hidden safety player */}
      <audio 
        ref={audioRef}
        src={currentSrc}
        style={{ display: 'none' }} 
      />

      <div style={{ position: 'relative', height: '100%' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="animate-spin" style={{ width: '12px', height: '12px', border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Analyzing Audio...
              </span>
            </div>
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 10, fontSize: '10px', color: 'var(--color-error)' }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
