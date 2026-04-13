import { useState } from 'react'

export default function PasteModal({ onSubmit, onCancel }) {
  const [text, setText] = useState('')

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <h2>Paste Text</h2>
        <label>Document text</label>
        <textarea
          className="paste-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your story or script here…"
          autoFocus
        />
        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-accent"
            onClick={() => text.trim() && onSubmit(text)}
            disabled={!text.trim()}
          >
            Load Text
          </button>
        </div>
      </div>
    </div>
  )
}
