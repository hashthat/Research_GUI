import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { extractTextFromDocx } from '../utils/docxParser'

const EMPTY_APA = {
  type: 'journal',
  authors: '',
  year: '',
  title: '',
  journal: '',
  volume: '',
  issue: '',
  pages: '',
  doi: '',
  publisher: '',
  editors: '',
  bookTitle: '',
  siteName: '',
  url: '',
}

function Field({ label, required, hint, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4, marginTop: 12 }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, color: 'var(--text-muted)', opacity: .7 }}>{hint}</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ''}
        style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, padding: '7px 10px', fontFamily: 'inherit' }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)' }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
      />
    </div>
  )
}

export default function ApaSourceModal({ onSave, onCancel, editSource }) {
  // If editSource is provided, skip file step and go straight to APA editing
  const [step, setStep] = useState(editSource ? 2 : 1)
  const [loadedText, setLoadedText] = useState(editSource?.text || '')
  const [fileName, setFileName] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [apa, setApa] = useState(editSource ? { ...EMPTY_APA, ...editSource.apa } : { ...EMPTY_APA })

  const setField = (key, val) => setApa((prev) => ({ ...prev, [key]: val }))

  const handlePickFile = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.openFile([
        { name: 'Text, Word or PDF', extensions: ['txt', 'docx', 'pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ])
      if (!result) { setLoading(false); return }
      let text = ''
      if (result.text !== undefined) {
        text = result.text
      } else {
        const ext = result.filePath.split('.').pop().toLowerCase()
        const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0))
        if (ext === 'txt') {
          text = new TextDecoder('utf-8').decode(bytes)
        } else if (ext === 'docx') {
          text = await extractTextFromDocx(bytes.buffer)
        } else {
          alert(`Unsupported file type: .${ext}`)
          setLoading(false)
          return
        }
      }
      setLoadedText(text)
      const name = result.filePath ? result.filePath.split(/[\\/]/).pop() : 'file'
      setFileName(name)
      setStep(2)
    } catch (e) {
      alert('Failed to open file: ' + e.message)
    }
    setLoading(false)
  }

  const handlePasteConfirm = () => {
    if (!pasteText.trim()) return
    setLoadedText(pasteText.trim())
    setFileName('Pasted text')
    setStep(2)
  }

  const handleSave = () => {
    if (!apa.authors.trim() && !apa.title.trim()) {
      alert('Please enter at least an author or title.')
      return
    }
    if (editSource) {
      onSave({ ...editSource, apa })
    } else {
      onSave({ id: uuidv4(), text: loadedText, annotations: [], apa })
    }
  }

  const typeOptions = ['journal', 'book', 'chapter', 'website']

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        {step === 1 && (
          <>
            <h2>{pasteMode ? 'Paste Source Text' : 'Load Source File'}</h2>
            {!pasteMode ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Load a PDF, DOCX, or TXT file to annotate.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-accent" onClick={handlePickFile} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                    {loading ? 'Loading…' : 'Choose File…'}
                  </button>
                  <button className="btn" onClick={() => setPasteMode(true)}>Paste Text</button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  className="paste-textarea"
                  placeholder="Paste your source text here…"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  style={{ minHeight: 200 }}
                />
                <div className="modal-footer">
                  <button className="btn" onClick={() => setPasteMode(false)}>Back</button>
                  <button className="btn" onClick={onCancel}>Cancel</button>
                  <button className="btn btn-accent" onClick={handlePasteConfirm} disabled={!pasteText.trim()}>
                    Next: Add Citation Info
                  </button>
                </div>
              </>
            )}
            {!pasteMode && (
              <div className="modal-footer">
                <button className="btn" onClick={onCancel}>Cancel</button>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2>{editSource ? 'Edit Citation Info' : 'Citation Info'}</h2>
            {fileName && !editSource && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                File: <strong style={{ color: 'var(--text)' }}>{fileName}</strong>
              </p>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4, marginTop: 4 }}>
                Source Type
              </label>
              <select
                value={apa.type}
                onChange={(e) => setField('type', e.target.value)}
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, padding: '7px 10px' }}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <Field label="Authors" required hint='e.g. "Smith, J., & Lee, K."' value={apa.authors} onChange={(v) => setField('authors', v)} placeholder="Smith, J., & Lee, K." />
            <Field label="Year" required value={apa.year} onChange={(v) => setField('year', v)} placeholder="2023" />
            <Field label="Title" required value={apa.title} onChange={(v) => setField('title', v)} placeholder="Article or book title" />

            {apa.type === 'journal' && (
              <>
                <Field label="Journal" value={apa.journal} onChange={(v) => setField('journal', v)} placeholder="Journal of Research" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <Field label="Volume" value={apa.volume} onChange={(v) => setField('volume', v)} placeholder="12" />
                  <Field label="Issue" value={apa.issue} onChange={(v) => setField('issue', v)} placeholder="3" />
                  <Field label="Pages" value={apa.pages} onChange={(v) => setField('pages', v)} placeholder="45–67" />
                </div>
                <Field label="DOI" value={apa.doi} onChange={(v) => setField('doi', v)} placeholder="10.1000/xyz123" />
              </>
            )}

            {apa.type === 'book' && (
              <Field label="Publisher" value={apa.publisher} onChange={(v) => setField('publisher', v)} placeholder="Oxford University Press" />
            )}

            {apa.type === 'chapter' && (
              <>
                <Field label="Editors" value={apa.editors} onChange={(v) => setField('editors', v)} placeholder="Brown, A." />
                <Field label="Book Title" value={apa.bookTitle} onChange={(v) => setField('bookTitle', v)} placeholder="Handbook of..." />
                <Field label="Pages" value={apa.pages} onChange={(v) => setField('pages', v)} placeholder="45–67" />
                <Field label="Publisher" value={apa.publisher} onChange={(v) => setField('publisher', v)} placeholder="Publisher name" />
              </>
            )}

            {apa.type === 'website' && (
              <>
                <Field label="Site Name" value={apa.siteName} onChange={(v) => setField('siteName', v)} placeholder="BBC News" />
                <Field label="URL" value={apa.url} onChange={(v) => setField('url', v)} placeholder="https://..." />
              </>
            )}

            <div className="modal-footer">
              {!editSource && <button className="btn" onClick={() => setStep(1)}>Back</button>}
              <button className="btn" onClick={onCancel}>Cancel</button>
              <button className="btn btn-accent" onClick={handleSave}>
                {editSource ? 'Save Changes' : 'Add Source'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
