import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'

export function PreviewArea() {
  const { t } = useTranslation()
  const { images, clips, isPlaying, setIsPlaying, currentTime, totalDuration, selectedClipId } = useProjectStore()

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
    <div className="preview-area">
      {selectedImage?.thumbnailDataUrl ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {/* Inner container that wraps the image tightly */}
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex' }}>
            <img
              src={selectedImage.thumbnailDataUrl}
              alt={selectedImage.name}
              onClick={handleImageClick}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                cursor: 'crosshair'
              }}
            />
            
            {/* Focus point indicator - Now relative to the image container */}
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
                {/* Crosshair lines for professional feel */}
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
      ) : images.length > 0 ? (
        <div className="preview-placeholder">
          <div className="preview-placeholder-icon">🖼</div>
          <span style={{ fontSize: 'var(--fs-sm)' }}>
            Select a clip on the timeline to preview
          </span>
        </div>
      ) : (
        <div className="preview-placeholder">
          <div className="preview-placeholder-icon">🎬</div>
          <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>
            {t('app.name')}
          </span>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>
            {t('preview.noContent')}
          </span>
        </div>
      )}

      {/* Playback controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          background: 'rgba(13, 13, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-default)'
        }}
      >
        <button className="btn btn-icon btn-sm" title={t('preview.play')}>
          ⏮
        </button>
        <button
          className="btn btn-icon"
          style={{
            width: '36px',
            height: '36px',
            background: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '50%'
          }}
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? t('preview.pause') : t('preview.play')}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="btn btn-icon btn-sm" title={t('preview.stop')}>
          ⏭
        </button>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginLeft: '8px', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  )
}
