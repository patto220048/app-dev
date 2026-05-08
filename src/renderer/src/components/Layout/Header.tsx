import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settingsStore'
import { useProjectStore } from '../../stores/projectStore'

export function Header() {
  const { t } = useTranslation()
  const { setShowSettings } = useSettingsStore()
  const { clips, images, audio, beatData, tracks, aspectRatio, setAspectRatio } = useProjectStore()
  const [exporting, setExporting] = useState(false)

  const handleNewProject = () => {
    // TODO: confirm if unsaved
    window.location.reload()
  }

  const handleSave = async () => {
    try {
      const state = useProjectStore.getState()
      const data = JSON.stringify({
        version: '1.0.0',
        images: state.images,
        audio: state.audio,
        tracks: state.tracks,
        clips: state.clips,
        beatData: state.beatData
      })
      const savedPath = await (window as any).api.saveProject(data)
      if (savedPath) {
        alert('Project saved successfully!')
      }
    } catch (e) {
      console.error('Save failed:', e)
      alert('Save failed: ' + e)
    }
  }

  const handleOpen = async () => {
    try {
      const result = await (window as any).api.loadProject()
      if (result?.data) {
        const d = result.data
        useProjectStore.setState({
          images: d.images || [],
          audio: d.audio || null,
          beatData: d.beatData || null,
          tracks: d.tracks || [
            { id: '1', name: 'Video 1', type: 'video' }
          ],
          clips: d.clips || [],
          selectedClipId: null,
          currentTime: 0
        })
      }
    } catch (e) {
      console.error('Open failed:', e)
    }
  }

  const handleExport = async () => {
    if (clips.length === 0) return
    setExporting(true)
    
    try {
      const outputPath = await (window as any).api.saveExport()
      if (!outputPath) {
        setExporting(false)
        return
      }

      // Build export options
      const options = {
        clips: clips.sort((a, b) => a.startTime - b.startTime).map(clip => {
          const img = images.find(i => i.id === clip.mediaId)
          return {
            imagePath: img?.path || '',
            videoPath: clip.aiClipPath,
            duration: clip.duration,
            speedCurve: clip.speedCurve.keyframes
          }
        }),
        audioPath: audio?.path,
        outputPath,
        resolution: '1080p',
        aspectRatio
      }

      await (window as any).api.exportProject(options)
      alert(t('export.success'))
    } catch (e: any) {
      console.error('Export failed:', e)
      alert('Export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <header className="header">
      <div className="header-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" fill="url(#grad)" stroke="none" />
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-primary)" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
        </svg>
        <span>{t('app.name')}</span>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button className="btn btn-sm" onClick={handleNewProject}>
          📄 {t('header.newProject')}
        </button>
        <button className="btn btn-sm" onClick={handleOpen}>
          📂 {t('header.open')}
        </button>
        <button className="btn btn-sm" onClick={handleSave}>
          💾 {t('header.save')}
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Aspect Ratio Selector */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-subtle)', marginRight: 'var(--sp-4)' }}>
        {(['16:9', '9:16', '1:1'] as const).map(ratio => (
          <button
            key={ratio}
            onClick={() => setAspectRatio(ratio)}
            style={{
              padding: '4px 12px',
              border: 'none',
              background: aspectRatio === ratio ? 'var(--accent-primary)' : 'transparent',
              color: aspectRatio === ratio ? '#000' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '50px'
            }}
          >
            {ratio}
          </button>
        ))}
      </div>

      <div className="header-actions">
        <button 
          className="btn btn-primary btn-sm" 
          disabled={clips.length === 0 || exporting}
          onClick={handleExport}
        >
          {exporting ? '⏳ ' + t('export.progress') : '🎬 ' + t('header.export')}
        </button>
        <button className="btn btn-sm" onClick={() => setShowSettings(true)}>
          ⚙️ {t('header.settings')}
        </button>
      </div>
    </header>
  )
}
