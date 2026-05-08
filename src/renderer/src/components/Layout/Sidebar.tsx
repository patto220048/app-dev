import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'

export function Sidebar() {
  const { t } = useTranslation()
  const { images, audio, addImages, removeImage, setAudio, addImageToTimeline } = useProjectStore()
  const [dragOver, setDragOver] = useState(false)

  const handleImportImages = async () => {
    try {
      const files = await (window as any).api.openImages()
      if (files?.length > 0) {
        // Load thumbnails
        const withThumbs = await Promise.all(
          files.map(async (f: any) => {
            try {
              const dataUrl = await (window as any).api.readFileAsBase64(f.path)
              return { ...f, thumbnailDataUrl: dataUrl }
            } catch {
              return f
            }
          })
        )
        addImages(withThumbs)
      }
    } catch (e) {
      console.error('Import images failed:', e)
    }
  }

  const handleImportAudio = async () => {
    try {
      const file = await (window as any).api.openAudio()
      if (file) {
        setAudio(file)
      }
    } catch (e) {
      console.error('Import audio failed:', e)
    }
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter((f) =>
        /\.(png|jpg|jpeg|webp)$/i.test(f.name)
      )
      const audioFiles = files.filter((f) =>
        /\.(mp3|wav|ogg|m4a)$/i.test(f.name)
      )

      if (imageFiles.length > 0) {
        const mapped = await Promise.all(
          imageFiles.map(async (f) => {
            const dataUrl = await readFileAsDataUrl(f)
            return {
              id: crypto.randomUUID(),
              path: (f as any).path || f.name,
              name: f.name,
              type: 'image' as const,
              thumbnailDataUrl: dataUrl
            }
          })
        )
        addImages(mapped)
      }

      if (audioFiles.length > 0) {
        const f = audioFiles[0]
        setAudio({
          id: crypto.randomUUID(),
          path: (f as any).path || f.name,
          name: f.name,
          type: 'audio'
        })
      }
    },
    [addImages, setAudio]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDoubleClickImage = (image: any) => {
    // Add to first available track at end
    const { clips, tracks } = useProjectStore.getState()
    const videoTracks = tracks.filter((t) => t.type === 'video')
    const trackIdx = 0
    const trackClips = clips.filter((c) => c.trackIndex === trackIdx)
    const lastEnd = trackClips.reduce(
      (max, c) => Math.max(max, c.startTime + c.duration),
      0
    )
    addImageToTimeline(image, trackIdx, lastEnd)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{t('sidebar.media')}</span>
      </div>

      <div
        className="sidebar-content"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
      >
        {/* Images section */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase'
              }}
            >
              🖼 {t('sidebar.images')} ({images.length})
            </span>
            <button className="btn btn-sm" onClick={handleImportImages}>
              + {t('sidebar.importImages')}
            </button>
          </div>

          {images.length === 0 ? (
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={handleImportImages}
              style={{ padding: '20px' }}
            >
              <div className="drop-zone-icon">🖼</div>
              <div className="drop-zone-text">{t('import.dropImages')}</div>
              <div className="drop-zone-hint">{t('import.supported')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {images.map((img) => (
                <div
                  key={img.id}
                  className="media-item"
                  onDoubleClick={() => handleDoubleClickImage(img)}
                  title="Double-click to add to timeline"
                >
                  {img.thumbnailDataUrl ? (
                    <img
                      src={img.thumbnailDataUrl}
                      alt={img.name}
                      className="media-thumbnail"
                    />
                  ) : (
                    <div className="media-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                      🖼
                    </div>
                  )}
                  <div className="media-info">
                    <div className="media-name">{img.name}</div>
                    <div className="media-meta">Image</div>
                  </div>
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDoubleClickImage(img)
                    }}
                    title="Add to timeline"
                    style={{ fontSize: '14px', width: '24px', height: '24px', padding: 0 }}
                  >
                    +
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(img.id)
                    }}
                    style={{ opacity: 0.5, fontSize: '10px', width: '24px', height: '24px', padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Audio section */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase'
              }}
            >
              🎵 {t('sidebar.audio')}
            </span>
            <button className="btn btn-sm" onClick={handleImportAudio}>
              + {t('sidebar.importAudio')}
            </button>
          </div>

          {audio ? (
            <div className="media-item">
              <div
                className="media-thumbnail"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  background: 'var(--bg-hover)',
                  color: 'var(--accent-primary)'
                }}
              >
                🎵
              </div>
              <div className="media-info">
                <div className="media-name">{audio.name}</div>
                <div className="media-meta">Audio</div>
              </div>
              <button
                className="btn btn-sm btn-icon"
                onClick={() => setAudio(null)}
                style={{ opacity: 0.5, fontSize: '10px' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={handleImportAudio}
              style={{ padding: '16px' }}
            >
              <div className="drop-zone-icon">🎵</div>
              <div className="drop-zone-text">{t('import.dropAudio')}</div>
              <div className="drop-zone-hint">{t('import.supportedAudio')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
