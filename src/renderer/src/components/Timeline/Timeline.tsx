import { useRef, useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { AudioWaveform } from '../AudioWaveform/Waveform'

export function Timeline() {
  const { t } = useTranslation()
  const {
    tracks,
    clips,
    selectedClipId,
    selectClip,
    updateClip,
    addTrack,
    removeTrack,
    autoArrangeToBeats,
    beatData,
    images,
    pixelsPerSecond,
    setPixelsPerSecond,
    currentTime
  } = useProjectStore()

  const tracksAreaRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<{
    clipId: string
    offsetX: number
    startTrack: number
  } | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const totalDuration = beatData ? Math.ceil(beatData.duration) : 60 // seconds
  const totalWidth = totalDuration * pixelsPerSecond

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -5 : 5
        setPixelsPerSecond(pixelsPerSecond + delta)
      }
    },
    [pixelsPerSecond, setPixelsPerSecond]
  )

  const handleClipMouseDown = (
    e: React.MouseEvent,
    clipId: string,
    trackIndex: number
  ) => {
    e.stopPropagation()
    selectClip(clipId)
    const clip = clips.find((c) => c.id === clipId)
    if (!clip) return
    const clipLeft = clip.startTime * pixelsPerSecond
    const mouseX =
      e.clientX -
      (tracksAreaRef.current?.getBoundingClientRect().left || 0) +
      (tracksAreaRef.current?.scrollLeft || 0)
    setDragging({
      clipId,
      offsetX: mouseX - clipLeft,
      startTrack: trackIndex
    })
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isScrubbing) {
        handleSeek(e)
        return
      }
      if (!dragging) return
      const mouseX =
        e.clientX -
        (tracksAreaRef.current?.getBoundingClientRect().left || 0) +
        (tracksAreaRef.current?.scrollLeft || 0)
      const newStartTime = Math.max(0, (mouseX - dragging.offsetX) / pixelsPerSecond)

      // Determine track from Y position
      const mouseY =
        e.clientY -
        (tracksAreaRef.current?.getBoundingClientRect().top || 0) +
        (tracksAreaRef.current?.scrollTop || 0)
      const trackHeight = 44
      const rulerHeight = 24
      const newTrackIndex = Math.max(
        0,
        Math.min(
          tracks.length - 1,
          Math.floor((mouseY - rulerHeight) / trackHeight)
        )
      )

      updateClip(dragging.clipId, {
        startTime: Math.round(newStartTime * 20) / 20, // Snap to 0.05s
        trackIndex: newTrackIndex
      })
    },
    [dragging, isScrubbing, pixelsPerSecond, tracks.length, updateClip]
  )

  const handleMouseUp = () => {
    setDragging(null)
    setIsScrubbing(false)
  }

  const handleSeek = (e: React.MouseEvent | React.DragEvent | MouseEvent) => {
    const rect = tracksAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left + (tracksAreaRef.current?.scrollLeft || 0)
    const newTime = Math.max(0, mouseX / pixelsPerSecond)
    const store = useProjectStore.getState()
    store.setCurrentTime(newTime)
    store.setIsPlaying(false) // Stop and seek to position
  }

  const handleTrackAreaClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('track-row') || (e.target as HTMLElement).classList.contains('timeline-ruler')) {
      handleSeek(e)
      selectClip(null)
    }
  }

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true)
    handleSeek(e)
  }

  const videoTracks = tracks.filter((t) => t.type === 'video')

  // Render ruler marks
  const rulerMarks = []
  for (let i = 0; i <= totalDuration; i++) {
    const isMajor = i % 5 === 0
    rulerMarks.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${i * pixelsPerSecond}px`,
          top: 0,
          height: isMajor ? '100%' : '40%',
          width: '1px',
          background: isMajor
            ? 'var(--border-strong)'
            : 'var(--border-subtle)',
          bottom: 0
        }}
      >
        {isMajor && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              left: '4px',
              fontSize: '9px',
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap'
            }}
          >
            {formatTime(i)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="timeline-panel">
      {/* Toolbar */}
      <div className="timeline-toolbar">
        <span
          style={{
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}
        >
          ⚡ {t('timeline.title')}
        </span>
        <button className="btn btn-sm" onClick={addTrack}>
          + {t('timeline.addTrack')}
        </button>
        {beatData && (
          <button className="btn btn-sm btn-primary" onClick={autoArrangeToBeats}>
            🎵 {t('timeline.autoArrange')}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
          Zoom: {pixelsPerSecond}px/s (Ctrl+Scroll)
        </span>
      </div>

      {/* Timeline content */}
      <div className="timeline-content">
        {/* Track headers */}
        <div className="timeline-tracks-header">
          <div style={{ height: '24px', borderBottom: '1px solid var(--border-subtle)' }} />
          {videoTracks.map((track, i) => (
            <div key={track.id} className="track-header">
              <span style={{ fontSize: '14px' }}>🎬</span>
              <span className="track-header-name">{track.name}</span>
              {videoTracks.length > 1 && (
                <button
                  className="btn btn-sm btn-icon"
                  onClick={() => removeTrack(track.id)}
                  style={{ opacity: 0.4, fontSize: '9px', width: '20px', height: '20px' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {/* Audio track label */}
          <div className="track-header" style={{ height: '60px' }}>
            <span style={{ fontSize: '14px' }}>🎵</span>
            <span className="track-header-name">{t('timeline.audioTrack')}</span>
          </div>
          {/* Speed curve label */}
          <div className="track-header" style={{ height: '80px' }}>
            <span style={{ fontSize: '14px' }}>⚡</span>
            <span className="track-header-name">{t('timeline.speedCurve')}</span>
          </div>
        </div>

        {/* Tracks area */}
        <div
          ref={tracksAreaRef}
          className="timeline-tracks-area"
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleTrackAreaClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const data = e.dataTransfer.getData('application/json')
            if (!data) return
            try {
              const item = JSON.parse(data)
              if (item.type === 'image') {
                const rect = tracksAreaRef.current?.getBoundingClientRect()
                if (!rect) return
                const mouseX = e.clientX - rect.left + (tracksAreaRef.current?.scrollLeft || 0)
                const mouseY = e.clientY - rect.top + (tracksAreaRef.current?.scrollTop || 0)
                
                const startTime = Math.max(0, mouseX / pixelsPerSecond)
                const trackHeight = 44
                const rulerHeight = 24
                const trackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor((mouseY - rulerHeight) / trackHeight)))

                useProjectStore.getState().addClip({
                  id: crypto.randomUUID(),
                  mediaId: item.id,
                  trackIndex,
                  startTime: Math.round(startTime * 20) / 20,
                  duration: 5,
                  name: item.name,
                  speedCurve: { type: 'linear', keyframes: [{ time: 0, value: 1 }, { time: 1, value: 1 }] },
                  aiStatus: 'idle',
                  motionType: 'zoomIn'
                })
              }
            } catch (err) {
              console.error('Drop failed', err)
            }
          }}
        >
          {/* Ruler */}
          <div className="timeline-ruler" style={{ width: `${totalWidth}px` }} onMouseDown={handleRulerMouseDown}>
            {rulerMarks}
          </div>

          {/* Playhead */}
          <div
            className="playhead"
            style={{ left: `${currentTime * pixelsPerSecond}px`, top: '0' }}
          />

          {/* Video tracks */}
          {videoTracks.map((track, trackIdx) => (
            <div
              key={track.id}
              className="track-row"
              style={{ width: `${totalWidth}px` }}
            >
              {/* Beat markers */}
              {beatData?.beats.map((beat, bi) => (
                <div
                  key={bi}
                  className="beat-marker"
                  style={{ left: `${beat * pixelsPerSecond}px` }}
                />
              ))}

              {/* Clips on this track */}
              {clips
                .filter((c) => c.trackIndex === trackIdx)
                .map((clip) => {
                  const img = images.find((i) => i.id === clip.mediaId)
                  return (
                    <div
                      key={clip.id}
                      className={`timeline-clip ${
                        selectedClipId === clip.id ? 'selected' : ''
                      }`}
                      style={{
                        left: `${clip.startTime * pixelsPerSecond}px`,
                        width: `${clip.duration * pixelsPerSecond}px`
                      }}
                      onMouseDown={(e) =>
                        handleClipMouseDown(e, clip.id, trackIdx)
                      }
                    >
                      {img?.thumbnailDataUrl && (
                        <img
                          src={img.thumbnailDataUrl}
                          alt=""
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '3px',
                            objectFit: 'cover',
                            marginRight: '4px',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none'
                        }}
                      >
                        {clip.name}
                      </span>
                      {clip.aiStatus === 'generating' && (
                        <span className="animate-spin" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                          ⏳
                        </span>
                      )}
                      {clip.aiStatus === 'done' && (
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--color-success)' }}>
                          ✓
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          ))}

          {/* Audio waveform track */}
          <div style={{ width: `${totalWidth}px`, height: '60px', borderBottom: '1px solid var(--border-subtle)' }}>
            <AudioWaveform />
          </div>

          {/* Speed curve area */}
          <div
            className="curve-editor-container"
            style={{ width: `${totalWidth}px`, height: '80px' }}
          >
            <SpeedCurvePreview
              clips={clips}
              pixelsPerSecond={pixelsPerSecond}
              selectedClipId={selectedClipId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple speed curve visualization
function SpeedCurvePreview({
  clips,
  pixelsPerSecond,
  selectedClipId
}: {
  clips: any[]
  pixelsPerSecond: number
  selectedClipId: string | null
}) {
  const { updateClip } = useProjectStore()
  const [draggingKeyframe, setDraggingKeyframe] = useState<{ clipId: string; index: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxSpeed = 4
  const height = 80

  const handleMouseDown = (e: React.MouseEvent, clipId: string, index: number) => {
    e.stopPropagation()
    setDraggingKeyframe({ clipId, index })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingKeyframe || !containerRef.current) return

    const clip = clips.find(c => c.id === draggingKeyframe.clipId)
    if (!clip) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate time and value
    const clipStartX = clip.startTime * pixelsPerSecond
    const clipWidthX = clip.duration * pixelsPerSecond
    
    let newTime = (mouseX - clipStartX) / clipWidthX
    newTime = Math.max(0, Math.min(1, newTime))

    let newValue = ((height - mouseY) / height) * maxSpeed
    newValue = Math.max(0.1, Math.min(maxSpeed, newValue))

    // First and last keyframes should stay at time 0 and 1
    if (draggingKeyframe.index === 0) newTime = 0
    if (draggingKeyframe.index === clip.speedCurve.keyframes.length - 1) newTime = 1

    const newKeyframes = [...clip.speedCurve.keyframes]
    newKeyframes[draggingKeyframe.index] = { ...newKeyframes[draggingKeyframe.index], time: newTime, value: newValue }

    // Sort by time
    newKeyframes.sort((a, b) => a.time - b.time)

    updateClip(clip.id, {
      speedCurve: {
        type: 'custom',
        keyframes: newKeyframes
      }
    })
  }, [draggingKeyframe, clips, pixelsPerSecond, updateClip])

  const handleMouseUp = useCallback(() => {
    setDraggingKeyframe(null)
  }, [])

  useEffect(() => {
    if (draggingKeyframe) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingKeyframe, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Grid lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderTop: '1px solid var(--border-subtle)',
          background: `repeating-linear-gradient(
            to right,
            transparent,
            transparent ${pixelsPerSecond * 5 - 1}px,
            var(--border-subtle) ${pixelsPerSecond * 5 - 1}px,
            var(--border-subtle) ${pixelsPerSecond * 5}px
          )`
        }}
      />
      {/* 1x speed line */}
      <div
        style={{
          position: 'absolute',
          top: `${height - (1 / maxSpeed) * height}px`,
          left: 0,
          right: 0,
          height: '1px',
          background: 'var(--border-default)',
          opacity: 0.5
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: `${height - (1 / maxSpeed) * height - 8}px`,
          left: '4px',
          fontSize: '9px',
          color: 'var(--text-tertiary)'
        }}
      >
        1x
      </span>

      {/* Curve paths per clip */}
      {clips.map((clip) => {
        const isSelected = clip.id === selectedClipId
        const x = clip.startTime * pixelsPerSecond
        const w = clip.duration * pixelsPerSecond
        const { keyframes } = clip.speedCurve

        // Build simple SVG path
        const points = keyframes
          .map((kf: any) => {
            const px = x + kf.time * w
            const py = height - (kf.value / maxSpeed) * height
            return `${px},${py}`
          })
          .join(' ')

        return (
          <svg
            key={clip.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible',
              pointerEvents: isSelected ? 'auto' : 'none',
              zIndex: isSelected ? 10 : 1
            }}
          >
            <polyline
              points={points}
              fill="none"
              stroke={isSelected ? 'var(--color-keyframe)' : 'var(--accent-primary)'}
              strokeWidth={isSelected ? 2 : 1.5}
              opacity={isSelected ? 1 : 0.6}
            />
            {/* Keyframe dots */}
            {keyframes.map((kf: any, i: number) => {
              const cx = x + kf.time * w
              const cy = height - (kf.value / maxSpeed) * height
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6 : 3}
                  fill={isSelected ? 'var(--color-keyframe)' : 'var(--accent-primary)'}
                  style={{ 
                    filter: isSelected ? 'drop-shadow(0 0 4px var(--color-keyframe-glow))' : 'none',
                    cursor: isSelected ? 'move' : 'default'
                  }}
                  onMouseDown={(e) => isSelected && handleMouseDown(e, clip.id, i)}
                />
              )
            })}
          </svg>
        )
      })}
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
