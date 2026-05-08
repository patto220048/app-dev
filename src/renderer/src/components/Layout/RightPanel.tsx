import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { CurveEditor } from '../SpeedCurve/CurveEditor'
import { MotionPanel } from '../MotionControl/MotionPanel'

export function RightPanel() {
  const { t } = useTranslation()
  const { selectedClipId, clips } = useProjectStore()
  const [activeTab, setActiveTab] = useState<'transform' | 'speed'>('transform')
  
  const selectedClip = clips.find((c) => c.id === selectedClipId)

  if (!selectedClip) {
    return (
      <div className="sidebar" style={{ width: '320px', minWidth: '320px', borderLeft: '1px solid var(--border-subtle)', borderRight: 'none' }}>
        <div className="sidebar-header">
          <span className="sidebar-title">Properties</span>
        </div>
        <div className="sidebar-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--sp-4)' }}>
          Select a clip to edit properties
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar" style={{ width: '320px', minWidth: '320px', borderLeft: '1px solid var(--border-subtle)', borderRight: 'none', overflowY: 'auto' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <button 
          onClick={() => setActiveTab('transform')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'transform' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'transform' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t('properties.transform')}
        </button>
        <button 
          onClick={() => setActiveTab('speed')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'speed' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'speed' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 'var(--fs-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t('properties.speed')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'transform' ? (
          <MotionPanel />
        ) : (
          <CurveEditor />
        )}
      </div>
    </div>
  )
}
