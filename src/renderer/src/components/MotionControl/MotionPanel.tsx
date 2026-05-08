import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import type { MotionType } from '../../types'
import { buildPrompt } from '../../utils/prompt-builder'

const MOTION_TYPES: { id: MotionType; icon: string; label: string }[] = [
  { id: 'zoomIn', icon: '🔍+', label: 'motion.zoomIn' },
  { id: 'zoomOut', icon: '🔍-', label: 'motion.zoomOut' },
  { id: 'panLeft', icon: '←', label: 'motion.panLeft' },
  { id: 'panRight', icon: '→', label: 'motion.panRight' },
  { id: 'dolly', icon: '🎥', label: 'motion.dolly' },
  { id: 'orbit', icon: '🔄', label: 'motion.orbit' },
  { id: 'trackSubject', icon: '🎯', label: 'motion.trackSubject' },
  { id: 'custom', icon: '✏️', label: 'curve.custom' }
]

export function MotionPanel() {
  const { t } = useTranslation()
  const { clips, selectedClipId, updateClip, images } = useProjectStore()
  const selectedClip = clips.find((c) => c.id === selectedClipId)
  const selectedImage = selectedClip ? images.find(i => i.id === selectedClip.mediaId) : null

  const [promptPreview, setPromptPreview] = useState('')

  useEffect(() => {
    if (selectedClip && selectedImage) {
      setPromptPreview(buildPrompt(selectedClip, selectedImage.name))
    }
  }, [selectedClip?.motionType, selectedClip?.focusPoint, selectedImage])

  if (!selectedClip) return null

  const handleMotionChange = (type: MotionType) => {
    updateClip(selectedClip.id, { motionType: type })
  }

  const handleGenerate = async () => {
    // Generate AI clip
    updateClip(selectedClip.id, { aiStatus: 'generating' })
    try {
      // Simulate API call for now
      setTimeout(() => {
        updateClip(selectedClip.id, { aiStatus: 'done' })
      }, 2000)
    } catch (e) {
      updateClip(selectedClip.id, { aiStatus: 'error' })
    }
  }

  return (
    <div style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>{t('motion.title')}</h3>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">{t('motion.type')}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
          {MOTION_TYPES.map(mt => (
            <button
              key={mt.id}
              className={`btn btn-sm ${selectedClip.motionType === mt.id ? 'btn-primary' : ''}`}
              onClick={() => handleMotionChange(mt.id)}
              style={{ justifyContent: 'flex-start' }}
            >
              <span style={{ width: '20px' }}>{mt.icon}</span>
              {t(mt.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">{t('motion.focusPoint')}</label>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', background: 'var(--bg-deep)', padding: 'var(--sp-2)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-default)' }}>
          {selectedClip.focusPoint 
            ? `X: ${Math.round(selectedClip.focusPoint.x * 100)}%, Y: ${Math.round(selectedClip.focusPoint.y * 100)}%`
            : t('motion.clickToSet')
          }
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">{t('motion.promptPreview')}</label>
        <textarea
          className="input"
          readOnly
          value={promptPreview}
          style={{ width: '100%', height: '80px', resize: 'none', fontSize: 'var(--fs-xs)', fontFamily: 'monospace' }}
        />
      </div>

      <button 
        className="btn btn-primary" 
        onClick={handleGenerate}
        disabled={selectedClip.aiStatus === 'generating'}
        style={{ width: '100%', marginTop: 'var(--sp-2)' }}
      >
        {selectedClip.aiStatus === 'generating' ? '⏳ Generating...' : '✨ Generate AI Clip'}
      </button>
    </div>
  )
}
