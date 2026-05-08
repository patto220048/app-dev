import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settingsStore'

export function SettingsDialog() {
  const { t } = useTranslation()
  const { settings, setSettings, showSettings, setShowSettings, saveSettings } =
    useSettingsStore()

  const [localSettings, setLocalSettings] = useState(settings)

  if (!showSettings) return null

  const handleSave = async () => {
    setSettings(localSettings)
    await saveSettings()
    setShowSettings(false)
  }

  return (
    <div className="modal-overlay" onClick={() => setShowSettings(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">⚙️ {t('settings.title')}</h2>

        <div className="form-group">
          <label className="form-label">{t('settings.apiProvider')}</label>
          <select
            className="select"
            style={{ width: '100%' }}
            value={localSettings.apiProvider}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                apiProvider: e.target.value as 'fal' | 'replicate'
              })
            }
          >
            <option value="fal">{t('settings.fal')}</option>
            <option value="replicate">{t('settings.replicate')}</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            {t('settings.apiKey')}
            <span className="form-label-hint">
              {' '}
              ({localSettings.apiProvider === 'fal' ? 'FAL_KEY' : 'REPLICATE_API_TOKEN'})
            </span>
          </label>
          <input
            type="password"
            className="input"
            style={{ width: '100%' }}
            placeholder={t('settings.apiKeyPlaceholder')}
            value={localSettings.apiKey}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, apiKey: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('settings.language')}</label>
          <select
            className="select"
            style={{ width: '100%' }}
            value={localSettings.language}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                language: e.target.value as 'en' | 'vi'
              })
            }
          >
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={() => setShowSettings(false)}>
            {t('settings.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
