import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { CurveEditor } from '../SpeedCurve/CurveEditor'
import { MotionPanel } from '../MotionControl/MotionPanel'

export function RightPanel() {
  const { t } = useTranslation()
  const { selectedClipId, clips } = useProjectStore()
  const selectedClip = clips.find((c) => c.id === selectedClipId)

  if (!selectedClip) {
    return (
      <div className="sidebar" style={{ width: '300px', minWidth: '300px', borderLeft: '1px solid var(--border-subtle)', borderRight: 'none' }}>
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
    <div className="sidebar" style={{ width: '300px', minWidth: '300px', borderLeft: '1px solid var(--border-subtle)', borderRight: 'none', overflowY: 'auto' }}>
      <div className="sidebar-header">
        <span className="sidebar-title">Properties</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <MotionPanel />
        <div className="divider" style={{ margin: 0 }} />
        <CurveEditor />
      </div>
    </div>
  )
}
