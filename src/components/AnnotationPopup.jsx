import { useEffect, useRef, useState } from 'react'

const HIGHLIGHT_COLORS = [
  '#fef08a', // yellow
  '#86efac', // green
  '#93c5fd', // blue
  '#f9a8d4', // pink
  '#fdba74', // orange
  '#c4b5fd', // purple
]

export default function AnnotationPopup({ rect, onHighlight, onLabel, onDismiss }) {
  const ref = useRef(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [note, setNote] = useState('')

  // Position the popup below the selection
  useEffect(() => {
    if (!ref.current || !rect) return
    const el = ref.current
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.left
    let top = rect.bottom + 8

    if (left + el.offsetWidth > vw - 8) left = vw - el.offsetWidth - 8
    if (top + el.offsetHeight > vh - 8) top = rect.top - el.offsetHeight - 8
    if (left < 8) left = 8

    el.style.left = left + 'px'
    el.style.top = top + 'px'
  }, [rect, selectedColor]) // re-position when note area expands

  const handleConfirm = () => {
    if (!selectedColor) return
    onHighlight(selectedColor, note.trim())
  }

  return (
    <div
      ref={ref}
      className="ann-popup"
      style={{ position: 'fixed', top: 0, left: 0 }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
        Pick a color to highlight
      </div>
      <div className="popup-colors">
        {HIGHLIGHT_COLORS.map((color) => (
          <div
            key={color}
            className="color-swatch"
            style={{
              background: color,
              border: selectedColor === color ? '2px solid white' : '2px solid transparent',
              transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)'
            }}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </div>

      {selectedColor && (
        <>
          <textarea
            className="popup-note-input"
            placeholder="Add a footnote (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="popup-actions">
            <button className="btn" onClick={onDismiss}>Cancel</button>
            <button className="btn btn-accent" onClick={handleConfirm}>Highlight</button>
          </div>
        </>
      )}

      {!selectedColor && (
        <div className="popup-actions">
          <button className="btn" onClick={onLabel}>Tag Character</button>
        </div>
      )}
    </div>
  )
}
