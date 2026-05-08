import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Header } from './components/Layout/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { RightPanel } from './components/Layout/RightPanel'
import { PreviewArea } from './components/Preview/PreviewArea'
import { Timeline } from './components/Timeline/Timeline'
import { SettingsDialog } from './components/Settings/SettingsDialog'
import { useSettingsStore } from './stores/settingsStore'

function App() {
  const { i18n } = useTranslation()
  const { settings, loadSettings } = useSettingsStore()
  
  const [timelineHeight, setTimelineHeight] = useState(320)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    i18n.changeLanguage(settings.language)
  }, [settings.language])

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY
        // Constraints: 150px min, 70% of screen max
        if (newHeight > 150 && newHeight < window.innerHeight * 0.7) {
          setTimelineHeight(newHeight)
        }
      }
    },
    [isResizing]
  )

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
    } else {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  return (
    <div className={`app-layout ${isResizing ? 'is-resizing' : ''}`}>
      <div className="titlebar-drag-region" />
      <Header />
      <div className="main-content">
        <Sidebar />
        <div className="center-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="preview-container" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <PreviewArea />
          </div>
          
          {/* Vertical Resizer Handle */}
          <div 
            className="vertical-resizer" 
            onMouseDown={startResizing}
            style={{ 
              height: '4px', 
              background: isResizing ? 'var(--accent-primary)' : 'var(--border-default)', 
              cursor: 'row-resize',
              zIndex: 1000,
              transition: 'background 0.2s',
              margin: '-2px 0' // Increase hit area
            }}
          />

          <div className="timeline-container" style={{ height: `${timelineHeight}px`, minHeight: 0 }}>
            <Timeline />
          </div>
        </div>
        <RightPanel />
      </div>
      <SettingsDialog />
    </div>
  )
}

export default App
