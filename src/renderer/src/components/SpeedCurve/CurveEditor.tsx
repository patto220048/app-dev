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
  
  const [draggingKeyframe, setDraggingKeyframe] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxSpeed = 4
  const height = 160 // Taller for better control in sidebar

  const applyPreset = (presetId: SpeedCurvePreset) => {
    const preset = PRESETS.find(p => p.id === presetId)
    if (preset && selectedClip) {
      updateClip(selectedClip.id, {
        speedCurve: {
          type: presetId,
          keyframes: JSON.parse(JSON.stringify(preset.keyframes))
        }
      })
    }
  }

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setDraggingKeyframe(index)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingKeyframe === null || !containerRef.current || !selectedClip) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    let newTime = mouseX / rect.width
    newTime = Math.max(0, Math.min(1, newTime))

    let newValue = ((height - mouseY) / height) * maxSpeed
    newValue = Math.max(0.1, Math.min(maxSpeed, newValue))

    if (draggingKeyframe === 0) newTime = 0
    if (draggingKeyframe === selectedClip.speedCurve.keyframes.length - 1) newTime = 1

    const newKeyframes = [...selectedClip.speedCurve.keyframes]
    newKeyframes[draggingKeyframe] = { ...newKeyframes[draggingKeyframe], time: newTime, value: newValue }
    newKeyframes.sort((a, b) => a.time - b.time)

    updateClip(selectedClip.id, {
      speedCurve: { type: 'custom', keyframes: newKeyframes }
    })
  }, [draggingKeyframe, selectedClip, updateClip])

  const handleMouseUp = useCallback(() => setDraggingKeyframe(null), [])

  useEffect(() => {
    if (draggingKeyframe !== null) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingKeyframe, handleMouseMove, handleMouseUp])

  if (!selectedClip) {
    return (
      <div style={{ padding: 'var(--sp-4)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
        {t('curve.selectToEdit')}
      </div>
    )
  }

  const { keyframes } = selectedClip.speedCurve
  const width = containerRef.current?.getBoundingClientRect().width || 260

  // Bezier Path Generation
  let pathD = ""
  if (keyframes.length > 0) {
    pathD = `M ${keyframes[0].time * width} ${height - (keyframes[0].value / maxSpeed) * height}`
    for (let i = 0; i < keyframes.length - 1; i++) {
      const curr = keyframes[i]
      const next = keyframes[i+1]
      const cx1 = (curr.time + (next.time - curr.time) * 0.4) * width
      const cy1 = height - (curr.value / maxSpeed) * height
      const cx2 = (curr.time + (next.time - curr.time) * 0.6) * width
      const cy2 = height - (next.value / maxSpeed) * height
      const ex = next.time * width
      const ey = height - (next.value / maxSpeed) * height
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', padding: 'var(--sp-4)' }}>
      <div className="section-title">⚡ {t('curve.title')}</div>
      
      {/* AE Style Graph Editor */}
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: `${height}px`, 
          background: '#0a0a0f',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
          {[1, 2, 3].map(v => (
            <div key={v} style={{ position: 'absolute', top: `${height - (v / maxSpeed) * height}px`, left: 0, right: 0, height: '1px', background: '#fff' }} />
          ))}
          {[0.25, 0.5, 0.75].map(t => (
            <div key={t} style={{ position: 'absolute', left: `${t * 100}%`, top: 0, bottom: 0, width: '1px', background: '#fff' }} />
          ))}
        </div>

        <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <filter id="glow-curve">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Area under curve */}
          <path
            d={`${pathD} V ${height} H ${keyframes[0].time * width} Z`}
            fill="rgba(255, 200, 0, 0.1)"
            pointerEvents="none"
          />

          {/* Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#ffc800"
            strokeWidth="3"
            style={{ filter: 'url(#glow-curve)' }}
          />

          {/* Points */}
          {keyframes.map((kf, i) => (
            <g key={i} onMouseDown={(e) => handleMouseDown(e, i)} style={{ cursor: 'move' }}>
              <circle 
                cx={kf.time * width} 
                cy={height - (kf.value / maxSpeed) * height} 
                r="6" 
                fill="#ffc800" 
                stroke="#000" 
                strokeWidth="2" 
              />
              <circle 
                cx={kf.time * width} 
                cy={height - (kf.value / maxSpeed) * height} 
                r="12" 
                fill="transparent" 
              />
            </g>
          ))}
        </svg>

        {/* Labels */}
        <div style={{ position: 'absolute', left: '4px', top: '4px', fontSize: '10px', color: '#666', pointerEvents: 'none' }}>
          4x
        </div>
        <div style={{ position: 'absolute', left: '4px', top: `${height/2 - 10}px`, fontSize: '10px', color: '#666', pointerEvents: 'none' }}>
          2x
        </div>
        <div style={{ position: 'absolute', left: '4px', bottom: '4px', fontSize: '10px', color: '#666', pointerEvents: 'none' }}>
          0.1x
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            className={`btn btn-sm ${selectedClip.speedCurve.type === preset.id ? 'btn-primary' : ''}`}
            onClick={() => applyPreset(preset.id)}
            style={{ fontSize: '11px', padding: '6px' }}
          >
            {t(preset.label)}
          </button>
        ))}
      </div>
      
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
        Drag the points in the graph editor to create custom speed ramps. Vertical axis is speed, horizontal axis is time within the clip.
      </div>
    </div>
  )
}
