import { useState } from 'react'
import { formatReference, formatCitation } from '../utils/apaFormatter'

export default function ReferencesPanel({ sources, onInsertCitation, onEditApa }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="references-panel">
      <div className="references-panel-header" onClick={() => setCollapsed((c) => !c)}>
        <span>References</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && (
        <div className="references-list">
          {sources.length === 0 && (
            <div style={{ padding: '8px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
              No sources added yet. Add sources in the Annotate tab.
            </div>
          )}
          {sources.map((src) => {
            const segs = formatReference(src.apa)
            return (
              <div key={src.id} className="reference-row">
                <div className="reference-apa">
                  {segs.map((seg, i) =>
                    seg.italic
                      ? <em key={i}>{seg.text}</em>
                      : <span key={i}>{seg.text}</span>
                  )}
                </div>
                <div className="reference-actions">
                  <button
                    className="btn"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    title={`Insert ${formatCitation(src.apa)}`}
                    onClick={() => onInsertCitation(formatCitation(src.apa))}
                  >
                    Cite
                  </button>
                  <button
                    className="btn"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => onEditApa(src.id)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
