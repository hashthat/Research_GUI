import { useState } from 'react'

const CHARACTER_COLORS = [
  '#a6e3a1', '#89dceb', '#f9e2af', '#cba6f7', '#f38ba8', '#fab387'
]

const ROLES = ['protagonist', 'antagonist', 'supporting', 'narrator', 'other']

export default function CharacterModal({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [role, setRole] = useState(initial?.role || 'supporting')
  const [color, setColor] = useState(initial?.color || CHARACTER_COLORS[0])
  const [age, setAge] = useState(initial?.age || '')
  const [appearance, setAppearance] = useState(initial?.appearance || '')
  const [traits, setTraits] = useState(initial?.traits || [])
  const [traitInput, setTraitInput] = useState('')
  const [backstory, setBackstory] = useState(initial?.backstory || '')

  const addTrait = () => {
    const t = traitInput.trim()
    if (!t || traits.includes(t)) return
    setTraits((prev) => [...prev, t])
    setTraitInput('')
  }

  const removeTrait = (t) => setTraits((prev) => prev.filter((x) => x !== t))

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), role, color, age, appearance, traits, backstory })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h2>{initial ? 'Edit Character' : 'New Character'}</h2>

        <label htmlFor="char-name">Name *</label>
        <input
          id="char-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character name…"
          autoFocus
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="char-role">Role</label>
            <select id="char-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="char-age">Age (optional)</label>
            <input
              id="char-age"
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 24"
            />
          </div>
        </div>

        <label style={{ marginTop: 12 }}>Color</label>
        <div className="popup-colors" style={{ margin: '6px 0 12px' }}>
          {CHARACTER_COLORS.map((c) => (
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

        <label htmlFor="char-appearance">Appearance (optional)</label>
        <textarea
          id="char-appearance"
          value={appearance}
          onChange={(e) => setAppearance(e.target.value)}
          placeholder="Physical description, distinguishing features…"
          rows={2}
        />

        <label style={{ marginTop: 12 }}>Traits</label>
        <div className="trait-pills">
          {traits.map((t) => (
            <span key={t} className="trait-pill">
              {t}
              <button className="trait-pill-del" onClick={() => removeTrait(t)}>×</button>
            </span>
          ))}
        </div>
        <div className="trait-input-row">
          <input
            type="text"
            value={traitInput}
            onChange={(e) => setTraitInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrait() } }}
            placeholder="Add trait, press Enter…"
            style={{ flex: 1 }}
          />
          <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addTrait}>Add</button>
        </div>

        <label htmlFor="char-backstory" style={{ marginTop: 4 }}>Backstory / Notes (optional)</label>
        <textarea
          id="char-backstory"
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          placeholder="Background, motivation, story arc…"
          rows={3}
        />

        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent" onClick={handleSave} disabled={!name.trim()}>
            {initial ? 'Save' : 'Create Character'}
          </button>
        </div>
      </div>
    </div>
  )
}
