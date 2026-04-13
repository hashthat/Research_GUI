import { useState } from 'react'

const HIGHLIGHT_COLORS = [
  '#fef08a', '#86efac', '#93c5fd', '#f9a8d4', '#fdba74', '#c4b5fd',
]

export default function EditModal({ annotation, characters, onSave, onCancel }) {
  const [color, setColor] = useState(annotation.color || '#fef08a')
  const [note, setNote] = useState(annotation.note || '')
  const [selectedCharId, setSelectedCharId] = useState(
    annotation.characterId || characters[0]?.id || ''
  )

  const handleSave = () => {
    if (annotation.type === 'highlight') {
      onSave({ color, note })
    } else if (annotation.type === 'label') {
      const char = characters.find((c) => c.id === selectedCharId)
      onSave({
        label: char?.name || annotation.label,
        labelColor: char?.color || annotation.labelColor,
        characterId: selectedCharId,
        note
      })
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Annotation</h2>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 4 }}>
          &ldquo;{annotation.selectedText?.slice(0, 120)}{annotation.selectedText?.length > 120 ? '…' : ''}&rdquo;
        </div>

        {annotation.type === 'highlight' && (
          <>
            <label>Highlight color</label>
            <div className="popup-colors" style={{ margin: '6px 0 14px' }}>
              {HIGHLIGHT_COLORS.map((c) => (
                <div
                  key={c}
                  className="color-swatch"
                  style={{
                    background: c,
                    border: color === c ? '2px solid white' : '2px solid transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)'
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>

            <label htmlFor="edit-note">Footnote</label>
            <textarea
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add or edit footnote…"
              autoFocus
            />
          </>
        )}

        {annotation.type === 'label' && (
          <>
            <label htmlFor="edit-char">Character</label>
            {characters.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No characters defined.</div>
            ) : (
              <select
                id="edit-char"
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                autoFocus
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                ))}
              </select>
            )}
            <label htmlFor="edit-label-note" style={{ marginTop: 12 }}>Footnote (optional)</label>
            <textarea
              id="edit-label-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add or edit footnote…"
            />
          </>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
