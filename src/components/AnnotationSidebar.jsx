import { useState } from 'react'

export default function AnnotationSidebar({
  annotations,
  characters,
  onFocus,
  onEdit,
  onDelete,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter
}) {
  const [expandedCharId, setExpandedCharId] = useState(null)
  const sorted = [...annotations].sort((a, b) => a.start - b.start)

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        Annotations ({annotations.length})
      </div>

      <div className="sidebar-list">
        {sorted.length === 0 && (
          <div className="sidebar-empty">
            Select text in the document to add annotations.
          </div>
        )}
        {sorted.map((ann) => (
          <div
            key={ann.id}
            className="ann-card"
            onClick={() => onFocus(ann.id)}
          >
            <div className="ann-card-excerpt">
              &ldquo;{ann.selectedText?.slice(0, 60)}{ann.selectedText?.length > 60 ? '…' : ''}&rdquo;
            </div>
            {ann.type === 'label' && ann.label && (
              <div className="ann-card-body">
                <span
                  className="ann-label-badge"
                  style={{
                    background: (ann.labelColor || '#a6e3a1') + '33',
                    color: ann.labelColor || '#a6e3a1',
                    border: `1px solid ${ann.labelColor || '#a6e3a1'}66`
                  }}
                >
                  {ann.label}
                </span>
                {ann.note && (
                  <div style={{ fontSize: 12, color: 'var(--text)', fontStyle: 'italic', borderLeft: '2px solid var(--border)', paddingLeft: 8, marginTop: 6 }}>
                    {ann.note}
                  </div>
                )}
              </div>
            )}
            {ann.type === 'highlight' && (
              <div className="ann-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: ann.note ? 6 : 0 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: ann.color,
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  />
                  Highlight
                </div>
                {ann.note && (
                  <div style={{ fontSize: 12, color: 'var(--text)', fontStyle: 'italic', borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>
                    {ann.note}
                  </div>
                )}
              </div>
            )}
            <div className="ann-card-footer">
              <span className={`ann-type-badge ann-type-${ann.type}`}>
                {ann.type === 'label' ? 'character' : ann.type}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="ann-card-delete"
                  onClick={(e) => { e.stopPropagation(); onEdit(ann.id) }}
                  title="Edit annotation"
                  style={{ fontSize: 13 }}
                >
                  ✎
                </button>
                <button
                  className="ann-card-delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(ann.id) }}
                  title="Delete annotation"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Character Roster */}
      <div className="label-manager">
        <div className="label-manager-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Characters ({characters.length})</span>
          <button
            className="btn"
            style={{ padding: '2px 10px', fontSize: 11 }}
            onClick={onAddCharacter}
          >
            + Character
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          {characters.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
              No characters yet.
            </div>
          )}
          {characters.map((char) => (
            <div
              key={char.id}
              className="char-roster-card"
              onClick={() => setExpandedCharId(expandedCharId === char.id ? null : char.id)}
            >
              <div className="char-roster-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: char.color, display: 'inline-block', flexShrink: 0
                  }} />
                  <span className="char-roster-name">{char.name}</span>
                  <span className="char-role-badge" style={{
                    background: char.color + '33',
                    color: char.color,
                    border: `1px solid ${char.color}66`
                  }}>
                    {char.role}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="ann-card-delete"
                    style={{ fontSize: 13 }}
                    onClick={(e) => { e.stopPropagation(); onEditCharacter(char.id) }}
                    title="Edit character"
                  >✎</button>
                  <button
                    className="ann-card-delete"
                    onClick={(e) => { e.stopPropagation(); onDeleteCharacter(char.id) }}
                    title="Delete character"
                  >×</button>
                </div>
              </div>

              {expandedCharId === char.id && (
                <div className="char-roster-expanded">
                  {char.age && <div>Age: {char.age}</div>}
                  {char.appearance && <div style={{ marginTop: 4 }}>{char.appearance}</div>}
                  {char.traits.length > 0 && (
                    <div className="char-traits" style={{ marginTop: 6 }}>
                      {char.traits.map((t) => (
                        <span key={t} className="trait-tag">{t}</span>
                      ))}
                    </div>
                  )}
                  {char.backstory && (
                    <div style={{ marginTop: 6, fontStyle: 'italic' }}>{char.backstory}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
