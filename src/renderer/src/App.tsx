import { useEffect } from 'react'
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

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    i18n.changeLanguage(settings.language)
  }, [settings.language])

  return (
    <div className="app-layout">
      <div className="titlebar-drag-region" />
      <Header />
      <div className="main-content">
        <Sidebar />
        <div className="center-panel">
          <PreviewArea />
          <Timeline />
        </div>
        <RightPanel />
      </div>
      <SettingsDialog />
    </div>
  )
}

export default App
