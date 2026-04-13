import { useState } from 'react'

export default function NoteModal({ type, selectedText, characters, onSubmit, onCancel }) {
  const [note, setNote] = useState('')
  const [selectedCharId, setSelectedCharId] = useState(characters[0]?.id || '')

  const isNote = type === 'note'
  const isLabel = type === 'label'

  const handleSubmit = () => {
    if (isNote) {
      onSubmit({ note })
    } else if (isLabel) {
      const char = characters.find((c) => c.id === selectedCharId)
      if (!char) return
      onSubmit({ label: char.name, labelColor: char.color, characterId: char.id, note })
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isNote ? 'Add Note' : 'Tag Character'}</h2>

        <label>Selected Text</label>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontStyle: 'italic' }}>
          &ldquo;{selectedText?.slice(0, 120)}{selectedText?.length > 120 ? '…' : ''}&rdquo;
        </div>

        {isNote && (
          <>
            <label htmlFor="note-input">Note</label>
            <textarea
              id="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note…"
              autoFocus
            />
          </>
        )}

        {isLabel && (
          <>
            <label htmlFor="char-select">Character</label>
            {characters.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                No characters yet. Add characters in the sidebar first.
              </div>
            ) : (
              <select
                id="char-select"
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                autoFocus
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                ))}
              </select>
            )}
            <label htmlFor="label-note" style={{ marginTop: 12 }}>Footnote (optional)</label>
            <textarea
              id="label-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a footnote for this character tag…"
            />
          </>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-accent"
            onClick={handleSubmit}
            disabled={isNote ? !note.trim() : !selectedCharId}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
