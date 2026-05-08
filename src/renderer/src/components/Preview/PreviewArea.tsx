import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'

export function PreviewArea() {
  const { t } = useTranslation()
  const { images, selectedClipId, clips, updateClip } = useProjectStore()

  const selectedClip = clips.find((c) => c.id === selectedClipId)
  const selectedImage = selectedClip
    ? images.find((i) => i.id === selectedClip.mediaId)
    : null

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!selectedClip) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    updateClip(selectedClip.id, { focusPoint: { x, y } })
  }

  return (
    <div className="preview-area">
      {selectedImage?.thumbnailDataUrl ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          {/* Motion type badge */}
          {selectedClip && (
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
                fontWeight: 600
              }}
            >
              🎬 {selectedClip.motionType}
            </div>
          )}
          {/* Focus point indicator */}
          {selectedClip?.focusPoint && (
            <div
              style={{
                position: 'absolute',
                left: `${selectedClip.focusPoint.x * 100}%`,
                top: `${selectedClip.focusPoint.y * 100}%`,
                width: '20px',
                height: '20px',
                border: '2px solid var(--color-keyframe)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 12px var(--color-keyframe-glow)',
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '6px',
                  background: 'var(--color-keyframe)',
                  borderRadius: '50%'
                }}
              />
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
          title={t('preview.play')}
        >
          ▶
        </button>
        <button className="btn btn-icon btn-sm" title={t('preview.stop')}>
          ⏭
        </button>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginLeft: '8px', fontVariantNumeric: 'tabular-nums' }}>
          00:00 / 00:30
        </span>
      </div>
    </div>
  )
}
