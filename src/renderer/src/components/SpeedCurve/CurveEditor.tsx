import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import type { CurveKeyframe, SpeedCurvePreset } from '../../types'

const PRESETS: { id: SpeedCurvePreset; label: string; keyframes: CurveKeyframe[] }[] = [
  { id: 'linear', label: 'curve.linear', keyframes: [{ time: 0, value: 1 }, { time: 1, value: 1 }] },
  { id: 'easeIn', label: 'curve.easeIn', keyframes: [{ time: 0, value: 0.5 }, { time: 1, value: 3 }] },
  { id: 'easeOut', label: 'curve.easeOut', keyframes: [{ time: 0, value: 3 }, { time: 1, value: 0.5 }] },
  { id: 'easeInOut', label: 'curve.easeInOut', keyframes: [{ time: 0, value: 0.5 }, { time: 0.5, value: 3 }, { time: 1, value: 0.5 }] },
  { id: 'beatSync', label: 'curve.beatSync', keyframes: [{ time: 0, value: 0.5 }, { time: 0.25, value: 3 }, { time: 0.5, value: 1 }, { time: 0.75, value: 3 }, { time: 1, value: 0.5 }] },
  { id: 'bounce', label: 'curve.bounce', keyframes: [{ time: 0, value: 3 }, { time: 0.5, value: 0.5 }, { time: 1, value: 3 }] },
]

export function CurveEditor() {
  const { t } = useTranslation()
  const { clips, selectedClipId, updateClip } = useProjectStore()
  const selectedClip = clips.find(c => c.id === selectedClipId)

  if (!selectedClip) {
    return (
      <div style={{ padding: 'var(--sp-4)', color: 'var(--text-tertiary)', textAlign: 'center', fontSize: 'var(--fs-sm)' }}>
        Select a clip to edit its speed curve
      </div>
    )
  }

  const applyPreset = (presetId: SpeedCurvePreset) => {
    const preset = PRESETS.find(p => p.id === presetId)
    if (preset) {
      updateClip(selectedClip.id, {
        speedCurve: {
          type: presetId,
          keyframes: JSON.parse(JSON.stringify(preset.keyframes)) // Deep copy
        }
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', padding: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>{t('curve.title')}</h3>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
          {selectedClip.name}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            className={`btn btn-sm ${selectedClip.speedCurve.type === preset.id ? 'btn-primary' : ''}`}
            onClick={() => applyPreset(preset.id)}
          >
            {t(preset.label)}
          </button>
        ))}
        <button
          className={`btn btn-sm ${selectedClip.speedCurve.type === 'custom' ? 'btn-primary' : ''}`}
          disabled
        >
          {t('curve.custom')}
        </button>
      </div>

      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
        Edit the curve directly on the timeline track below. Drag points up/down to change speed, left/right to change timing.
      </div>
    </div>
  )
}
