import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'

export function PreviewArea() {
  const { t } = useTranslation()
  const { images, clips, isPlaying, setIsPlaying, currentTime, totalDuration, selectedClipId, aspectRatio } = useProjectStore()
  const [previewZoom, setPreviewZoom] = useState<number>(1) // 1 = Fit
  
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setPreviewZoom((prev: number) => Math.max(0.5, Math.min(5, prev + delta)))
    }
  }

  // Find the clip at the current playhead position
  // If multiple clips overlap, pick the one on the highest track index (top-most layer)
  const activeClip = [...clips]
    .filter(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration)
    .sort((a, b) => b.trackIndex - a.trackIndex)[0] || clips.find(c => c.id === selectedClipId)

  const selectedImage = activeClip
    ? images.find((i) => i.id === activeClip.mediaId)
    : null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const { updateClip } = useProjectStore()

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!activeClip) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    updateClip(activeClip.id, { focusPoint: { x, y } })
  }

  return (
    <div 
      className="preview-area" 
      onWheel={handleWheel}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      {/* Aspect Ratio Box Container */}
      <div 
        style={{ 
          flex: 1, 
          position: 'relative', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#000',
          overflow: 'auto', // Enable scrolling when zoomed in
          padding: '40px'
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            aspectRatio: aspectRatio.replace(':', '/'),
            background: '#05050a',
            boxShadow: '0 0 40px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            transform: `scale(${previewZoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease-out',
            flexShrink: 0 // Prevent collapsing when zoomed
          }}
        >
          {selectedImage?.thumbnailDataUrl ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
                <img
                  src={selectedImage.thumbnailDataUrl}
                  alt={selectedImage.name}
                  onClick={handleImageClick}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'crosshair'
                  }}
                />
                
                {/* Focus point indicator */}
                {activeClip?.focusPoint && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeClip.focusPoint.x * 100}%`,
                      top: `${activeClip.focusPoint.y * 100}%`,
                      width: '24px',
                      height: '24px',
                      border: '2px solid #ffc800',
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 0 15px rgba(255, 200, 0, 0.6)',
                      pointerEvents: 'none',
                      zIndex: 20
                    }}
                  >
                    <div style={{ position: 'absolute', top: '50%', left: '-4px', right: '-4px', height: '1px', background: '#ffc800' }} />
                    <div style={{ position: 'absolute', left: '50%', top: '-4px', bottom: '-4px', width: '1px', background: '#ffc800' }} />
                    <div
                      style={{
                        position: 'absolute',
                        inset: '8px',
                        background: '#ffc800',
                        borderRadius: '50%'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Motion type badge */}
              {activeClip && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--accent-blue)',
                    fontWeight: 600,
                    zIndex: 30
                  }}
                >
                  🎬 {activeClip.motionType}
                </div>
              )}
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="preview-placeholder-icon">🎬</div>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>
                {images.length > 0 ? 'Select a clip' : t('preview.noContent')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(12px)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          zIndex: 100,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}
      >
        <button className="btn btn-icon btn-sm" title={t('preview.play')} style={{ width: '24px', height: '24px', fontSize: '10px' }}>
          ⏮
        </button>
        <button
          className="btn btn-icon"
          style={{
            width: '28px',
            height: '28px',
            background: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '50%',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? t('preview.pause') : t('preview.play')}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="btn btn-icon btn-sm" title={t('preview.stop')} style={{ width: '24px', height: '24px', fontSize: '10px' }}>
          ⏭
        </button>
        
        <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)', margin: '0 6px' }} />
        
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, marginRight: '4px' }}>
          {formatTime(currentTime)}
        </span>

        <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)', margin: '0 6px' }} />

        {/* Zoom Selector */}
        <select 
          value={previewZoom} 
          onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            padding: '0 4px'
          }}
        >
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100% (Fit)</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
          <option value="3">300%</option>
        </select>
      </div>
    </div>
  )
}
