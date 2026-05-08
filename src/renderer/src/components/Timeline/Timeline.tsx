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
    audio,
    pixelsPerSecond,
    setPixelsPerSecond,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    addClip,
    removeClip
  } = useProjectStore()

  const tracksAreaRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<{
    clipId: string
    offsetX: number
    startTrack: number
    type: 'move' | 'resize-left' | 'resize-right'
    initialStartTime: number
    initialDuration: number
  } | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [snapLine, setSnapLine] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'gap' | 'clip'
    data: any
  } | null>(null)

  const totalDuration = beatData ? Math.ceil(beatData.duration) : 60 // seconds
  const totalWidth = totalDuration * pixelsPerSecond

  // Keyboard shortcuts
  useEffect(() => {
    let lastSpaceTime = 0
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.code === 'Space') {
        e.preventDefault()
        const now = Date.now()
        if (now - lastSpaceTime < 300) {
          // Double space: Back to start
          setCurrentTime(0)
          setIsPlaying(false)
        } else {
          // Single space: Toggle play
          setIsPlaying(!isPlaying)
        }
        lastSpaceTime = now
      } else if (e.key === '+' || e.key === '=') {
        setPixelsPerSecond(pixelsPerSecond + 10)
      } else if (e.key === '-' || e.key === '_') {
        setPixelsPerSecond(pixelsPerSecond - 10)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, setIsPlaying, setCurrentTime, pixelsPerSecond, setPixelsPerSecond])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        // Ctrl + Wheel: Zoom
        e.preventDefault()
        const delta = e.deltaY > 0 ? -10 : 10
        setPixelsPerSecond(pixelsPerSecond + delta)
      } else if (e.altKey) {
        // Alt + Wheel: Horizontal Scroll
        if (tracksAreaRef.current) {
          tracksAreaRef.current.scrollLeft += e.deltaY
        }
      }
    },
    [pixelsPerSecond, setPixelsPerSecond]
  )

  const handleClipMouseDown = (e: React.MouseEvent, clipId: string, trackIndex: number) => {
    e.stopPropagation()
    selectClip(clipId)

    const rect = e.currentTarget.getBoundingClientRect()
    const mouseXInClip = e.clientX - rect.left
    const handleSize = 10 // Increase for easier clicking
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return

    let type: 'move' | 'resize-left' | 'resize-right' = 'move'
    if (mouseXInClip < handleSize) type = 'resize-left'
    else if (mouseXInClip > rect.width - handleSize) type = 'resize-right'

    setDragging({
      clipId,
      offsetX: mouseXInClip,
      startTrack: trackIndex,
      type,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration
    })
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (isScrubbing) {
        handleSeek(e)
        return
      }
      if (!dragging) return

      const rect = tracksAreaRef.current?.getBoundingClientRect()
      if (!rect) return
      const mouseX = e.clientX - rect.left + (tracksAreaRef.current?.scrollLeft || 0)
      let currentTimeAtMouse = Math.max(0, mouseX / pixelsPerSecond)

      // Collect snap points
      const snapPoints = new Set<number>()
      snapPoints.add(currentTime) // Snap to playhead
      beatData?.beats.forEach(b => snapPoints.add(b)) // Snap to beats
      clips.forEach(c => {
        if (c.id !== dragging.clipId) {
          snapPoints.add(c.startTime) // Snap to other clips' start
          snapPoints.add(c.startTime + c.duration) // Snap to other clips' end
        }
      })

      const snapThreshold = 10 / pixelsPerSecond // 10 pixels in seconds
      let bestSnap: number | null = null

      const findSnap = (time: number) => {
        let closest: number | null = null
        let minDiff = snapThreshold
        snapPoints.forEach(p => {
          const diff = Math.abs(time - p)
          if (diff < minDiff) {
            minDiff = diff
            closest = p
          }
        })
        return closest
      }

      if (dragging.type === 'move') {
        let newStartTime = (mouseX - dragging.offsetX) / pixelsPerSecond

        // Snap start edge
        const snappedStart = findSnap(newStartTime)
        if (snappedStart !== null) {
          newStartTime = snappedStart
          bestSnap = snappedStart
        } else {
          // Snap end edge
          const snappedEnd = findSnap(newStartTime + dragging.initialDuration)
          if (snappedEnd !== null) {
            newStartTime = snappedEnd - dragging.initialDuration
            bestSnap = snappedEnd
          }
        }
        newStartTime = Math.max(0, newStartTime)

        const mouseY = e.clientY - rect.top + (tracksAreaRef.current?.scrollTop || 0)
        const trackHeight = 44
        const rulerHeight = 24
        const newTrackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor((mouseY - rulerHeight) / trackHeight)))

        updateClip(dragging.clipId, {
          startTime: bestSnap !== null ? newStartTime : Math.round(newStartTime * 20) / 20,
          trackIndex: newTrackIndex
        })
      } else if (dragging.type === 'resize-right') {
        let newDuration = currentTimeAtMouse - dragging.initialStartTime
        const snappedEnd = findSnap(dragging.initialStartTime + newDuration)
        if (snappedEnd !== null) {
          newDuration = snappedEnd - dragging.initialStartTime
          bestSnap = snappedEnd
        }
        updateClip(dragging.clipId, {
          duration: Math.max(0.1, bestSnap !== null ? newDuration : Math.round(newDuration * 20) / 20)
        })
      } else if (dragging.type === 'resize-left') {
        let newStartTime = currentTimeAtMouse
        const snappedStart = findSnap(newStartTime)
        if (snappedStart !== null) {
          newStartTime = snappedStart
          bestSnap = snappedStart
        }

        newStartTime = Math.min(dragging.initialStartTime + dragging.initialDuration - 0.1, newStartTime)
        const durationChange = dragging.initialStartTime - newStartTime
        const newDuration = dragging.initialDuration + durationChange

        updateClip(dragging.clipId, {
          startTime: bestSnap !== null ? newStartTime : Math.round(newStartTime * 20) / 20,
          duration: Math.max(0.1, Math.round(newDuration * 20) / 20)
        })
      }

      setSnapLine(bestSnap)
    },
    [dragging, isScrubbing, pixelsPerSecond, tracks.length, updateClip, currentTime, beatData, clips]
  )

  const resolveOverlaps = (movedClipId: string) => {
    const movedClip = clips.find(c => c.id === movedClipId)
    if (!movedClip) return

    const movedStart = movedClip.startTime
    const movedEnd = movedStart + movedClip.duration
    const trackIndex = movedClip.trackIndex

    let updatedClips = [...clips]
    let hasChanges = false

    clips.forEach(other => {
      if (other.id === movedClipId || other.trackIndex !== trackIndex) return

      const otherStart = other.startTime
      const otherEnd = otherStart + other.duration

      // 1. Completely covered by moved clip
      if (movedStart <= otherStart && movedEnd >= otherEnd) {
        updatedClips = updatedClips.filter(c => c.id !== other.id)
        hasChanges = true
      }
      // 2. Overlap at the end of other clip
      else if (movedStart > otherStart && movedStart < otherEnd && movedEnd >= otherEnd) {
        const newDuration = movedStart - otherStart
        updatedClips = updatedClips.map(c =>
          c.id === other.id ? { ...c, duration: Math.max(0.1, newDuration) } : c
        )
        hasChanges = true
      }
      // 3. Overlap at the start of other clip
      else if (movedEnd > otherStart && movedEnd < otherEnd && movedStart <= otherStart) {
        const newStartTime = movedEnd
        const newDuration = otherEnd - newStartTime
        updatedClips = updatedClips.map(c =>
          c.id === other.id ? { ...c, startTime: newStartTime, duration: Math.max(0.1, newDuration) } : c
        )
        hasChanges = true
      }
      // 4. Moved clip is inside other clip (Split or trim one side)
      // For simplicity, we'll trim the end of the other clip to where moved clip starts
      else if (movedStart > otherStart && movedEnd < otherEnd) {
        const newDuration = movedStart - otherStart
        updatedClips = updatedClips.map(c =>
          c.id === other.id ? { ...c, duration: Math.max(0.1, newDuration) } : c
        )
        hasChanges = true
      }
    })

    if (hasChanges) {
      useProjectStore.setState({ clips: updatedClips })
    }
  }

  const handleMouseUp = () => {
    if (dragging) {
      resolveOverlaps(dragging.clipId)
    }
    setDragging(null)
    setIsScrubbing(false)
    setSnapLine(null)
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

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const handleTrackContextMenu = (e: React.MouseEvent, trackIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = tracksAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left + (tracksAreaRef.current?.scrollLeft || 0)
    const clickTime = mouseX / pixelsPerSecond

    // Check if we clicked on a clip first
    const clickedClip = clips.find(c =>
      c.trackIndex === trackIndex &&
      clickTime >= c.startTime &&
      clickTime < c.startTime + c.duration
    )

    if (clickedClip) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'clip',
        data: { clipId: clickedClip.id }
      })
      return
    }

    // Check for gaps
    const trackClips = clips
      .filter(c => c.trackIndex === trackIndex)
      .sort((a, b) => a.startTime - b.startTime)

    let gapStart = 0
    let targetGap: { start: number, end: number } | null = null

    for (const clip of trackClips) {
      if (clickTime >= gapStart && clickTime < clip.startTime) {
        targetGap = { start: gapStart, end: clip.startTime }
        break
      }
      gapStart = clip.startTime + clip.duration
    }

    if (targetGap) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'gap',
        data: { trackIndex, gap: targetGap }
      })
    }
  }

  const closeGap = (trackIndex: number, gap: { start: number, end: number }) => {
    const gapSize = gap.end - gap.start
    const updatedClips = clips.map(c => {
      if (c.trackIndex === trackIndex && c.startTime >= gap.end) {
        return { ...c, startTime: c.startTime - gapSize }
      }
      return c
    })
    useProjectStore.setState({ clips: updatedClips })
    setContextMenu(null)
  }

  const deleteClipAction = (clipId: string) => {
    removeClip(clipId)
    setContextMenu(null)
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
        <button className="btn btn-sm" onClick={() => addTrack()}>
          + {t('timeline.addTrack')}
        </button>
        {beatData && (
          <button className="btn btn-sm btn-primary" onClick={autoArrangeToBeats}>
            🎵 {t('timeline.autoArrange')}
          </button>
        )}
        <div className="timeline-toolbar-group">
          <button className="btn btn-sm btn-icon" onClick={() => addTrack('video')} title="Add Video Track">
            🎬+
          </button>
          <button className="btn btn-sm btn-icon" onClick={() => addTrack('audio')} title="Add Audio Track">
            🎵+
          </button>
        </div>
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
          {tracks.map((track) => (
            <div 
              key={track.id} 
              className="track-header" 
              style={{ height: track.type === 'video' ? '44px' : '60px' }}
            >
              <span style={{ fontSize: '14px' }}>{track.type === 'video' ? '🎬' : '🎵'}</span>
              <span className="track-header-name">{track.name}</span>
              
              {/* Delete track button */}
              {(tracks.filter(t => t.type === track.type).length > 1) && (
                <button
                  className="btn btn-sm btn-icon"
                  onClick={() => removeTrack(track.id)}
                  style={{ opacity: 0.4, fontSize: '9px', width: '20px', height: '20px', marginLeft: 'auto' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
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

          {/* Snap Line */}
          {snapLine !== null && (
            <div
              style={{
                position: 'absolute',
                left: `${snapLine * pixelsPerSecond}px`,
                top: 0,
                bottom: 0,
                width: '1px',
                background: '#fff',
                boxShadow: '0 0 4px #fff',
                zIndex: 100,
                pointerEvents: 'none'
              }}
            />
          )}

          {/* Render all tracks contents */}
          {tracks.map((track, trackIdx) => (
            <div
              key={track.id}
              className={`track-row ${track.type}-track`}
              style={{ 
                width: `${totalWidth}px`, 
                height: track.type === 'video' ? '44px' : '60px',
                borderBottom: '1px solid var(--border-subtle)',
                position: 'relative'
              }}
              onContextMenu={(e) => handleTrackContextMenu(e, trackIdx)}
            >
              {track.type === 'video' ? (
                <>
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
                          className={`timeline-clip ${selectedClipId === clip.id ? 'selected' : ''
                            }`}
                          style={{
                            left: `${clip.startTime * pixelsPerSecond}px`,
                            width: `${clip.duration * pixelsPerSecond}px`
                          }}
                          onMouseDown={(e) =>
                            handleClipMouseDown(e, clip.id, trackIdx)
                          }
                          onContextMenu={(e) => handleTrackContextMenu(e, trackIdx)}
                        >
                          {/* Left Handle */}
                          <div className="clip-handle left" />

                          {img?.thumbnailDataUrl && (
                            <img
                              src={img.thumbnailDataUrl}
                              alt=""
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '3px',
                                objectFit: 'cover',
                                marginRight: '6px',
                                pointerEvents: 'none'
                              }}
                            />
                          )}
                          <span className="clip-name">
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
                </>
              ) : (
                <AudioWaveform file={audio} />
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Context Menu Dropdown */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px',
            minWidth: '160px',
            boxShadow: 'var(--shadow-lg)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'gap' ? (
            <button
              className="context-menu-item"
              onClick={() => closeGap(contextMenu.data.trackIndex, contextMenu.data.gap)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 'var(--fs-sm)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left'
              }}
            >
              <span>🧲</span> {t('timeline.closeGap')}
            </button>
          ) : (
            <button
              className="context-menu-item"
              onClick={() => deleteClipAction(contextMenu.data.clipId)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                color: '#ff4d4d',
                fontSize: 'var(--fs-sm)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left'
              }}
            >
              <span>🗑️</span> {t('common.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}



function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
