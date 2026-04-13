import { useState } from 'react'

export default function ExportModal({ documentText, annotations, characters, onClose }) {
  const [mode, setMode] = useState('wysiwyg')
  const [includeCharacters, setIncludeCharacters] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      let html
      if (mode === 'wysiwyg') {
        html = buildWysiwygHTML(documentText, annotations)
      } else if (mode === 'summary') {
        html = buildSummaryHTML(documentText, annotations)
      } else {
        html = buildAnnotationsOnlyHTML(annotations)
      }
      if (includeCharacters && characters?.length > 0) {
        html = appendCharacterProfiles(html, characters)
      }
      const base64 = await window.electronAPI.printToPDF(html)
      await window.electronAPI.saveFile({
        defaultPath: 'annotated.pdf',
        data: base64,
        encoding: 'base64'
      })
    } catch (e) {
      alert('Export failed: ' + e.message)
    } finally {
      setExporting(false)
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export PDF</h2>
        <div className="export-options">
          <label
            className={`export-option ${mode === 'wysiwyg' ? 'selected' : ''}`}
            onClick={() => setMode('wysiwyg')}
          >
            <input type="radio" name="export-mode" value="wysiwyg" checked={mode === 'wysiwyg'} onChange={() => setMode('wysiwyg')} />
            <div className="export-option-text">
              <strong>WYSIWYG (Visual)</strong>
              <span>Exports the annotated text as-is — highlights, character tags, and footnotes visible.</span>
            </div>
          </label>

          <label
            className={`export-option ${mode === 'summary' ? 'selected' : ''}`}
            onClick={() => setMode('summary')}
          >
            <input type="radio" name="export-mode" value="summary" checked={mode === 'summary'} onChange={() => setMode('summary')} />
            <div className="export-option-text">
              <strong>Clean Text + Annotation Summary</strong>
              <span>Readable text followed by a numbered list of all annotations and their notes.</span>
            </div>
          </label>

          <label
            className={`export-option ${mode === 'annotations-only' ? 'selected' : ''}`}
            onClick={() => setMode('annotations-only')}
          >
            <input type="radio" name="export-mode" value="annotations-only" checked={mode === 'annotations-only'} onChange={() => setMode('annotations-only')} />
            <div className="export-option-text">
              <strong>Annotation Summary Only</strong>
              <span>Just excerpts, character tags, and footnotes — no full document text.</span>
            </div>
          </label>
        </div>

        {characters?.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={includeCharacters}
              onChange={(e) => setIncludeCharacters(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            Append character profiles ({characters.length})
          </label>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={exporting}>Cancel</button>
          <button className="btn btn-accent" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- HTML builders ----

function buildWysiwygHTML(text, annotations) {
  const sorted = [...annotations].sort((a, b) => a.start - b.start)
  const footnotAnns = sorted.filter((a) => a.note && a.note.trim())
  const footnoteIndexMap = {}
  footnotAnns.forEach((a, i) => { footnoteIndexMap[a.id] = i + 1 })

  const points = new Set([0, text.length])
  for (const ann of sorted) {
    if (ann.start >= 0 && ann.end <= text.length && ann.start < ann.end) {
      points.add(ann.start)
      points.add(ann.end)
    }
  }
  const boundaries = Array.from(points).sort((a, b) => a - b)

  let body = ''
  for (let i = 0; i < boundaries.length - 1; i++) {
    const s = boundaries[i]
    const e = boundaries[i + 1]
    const active = sorted.filter((ann) => ann.start <= s && ann.end >= e && ann.start < ann.end)
    const highlights = active.filter((a) => a.type === 'highlight')
    const labels = active.filter((a) => a.type === 'label')

    const bgColor = highlights.length > 0
      ? highlights[0].color
      : labels.length > 0
        ? (labels[0].labelColor || '#a6e3a1') + '66'
        : 'transparent'

    const snippet = escapeHtml(text.slice(s, e))
    body += `<span style="background:${bgColor};border-radius:2px;">${snippet}</span>`

    const footnotedHere = active.filter((a) => a.end === e && footnoteIndexMap[a.id])
    for (const a of footnotedHere) {
      body += `<sup style="font-size:10px;font-weight:700;color:#555;margin-left:1px;">${footnoteIndexMap[a.id]}</sup>`
    }

    for (const l of labels.filter((a) => a.end === e)) {
      const lc = l.labelColor || '#a6e3a1'
      body += `<span style="font-size:10px;font-weight:600;border-radius:4px;padding:1px 6px;margin-left:3px;background:${lc}33;color:${lc};border:1px solid ${lc}66;">${escapeHtml(l.label)}</span>`
    }
  }

  let footnotes = ''
  if (footnotAnns.length > 0) {
    footnotes = `<hr style="margin:32px 0;border:none;border-top:1px solid #ccc;"/>
<h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:12px;">Footnotes</h2>
<ol style="font-size:12px;line-height:1.7;padding-left:20px;color:#333;">`
    for (const a of footnotAnns) {
      footnotes += `<li style="margin-bottom:10px;">${escapeHtml(a.note)}</li>`
    }
    footnotes += '</ol>'
  }

  return wrapPage(`<div style="white-space:pre-wrap;word-wrap:break-word;">${body}</div>${footnotes}`)
}

function buildSummaryHTML(text, annotations) {
  const sorted = [...annotations].sort((a, b) => a.start - b.start)

  let annList = ''
  if (sorted.length > 0) {
    annList = `<hr style="margin:32px 0;border:none;border-top:1px solid #ccc;"/>
<h2 style="font-size:15px;font-weight:700;margin-bottom:16px;">Annotations</h2>`
    sorted.forEach((ann) => {
      const typeLabel = ann.type === 'label' ? 'Character Tag' : ann.type.charAt(0).toUpperCase() + ann.type.slice(1)
      let detail = ''
      if (ann.type === 'label') detail = `<p style="margin:4px 0 0;font-size:13px;">Character: <strong>${escapeHtml(ann.label)}</strong>${ann.note ? ` — ${escapeHtml(ann.note)}` : ''}</p>`
      if (ann.type === 'highlight') detail = `<p style="margin:4px 0 0;font-size:13px;">${ann.note ? escapeHtml(ann.note) : 'Highlight'}</p>`
      annList += `<div style="margin-bottom:16px;padding:10px 14px;border-left:3px solid #888;background:#f9f9f9;">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:4px;">${typeLabel}</div>
  <em style="font-size:13px;">&ldquo;${escapeHtml(ann.selectedText?.slice(0, 140))}${ann.selectedText?.length > 140 ? '…' : ''}&rdquo;</em>
  ${detail}
</div>`
    })
  }

  return wrapPage(`<div style="white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(text)}</div>${annList}`)
}

function buildAnnotationsOnlyHTML(annotations) {
  const sorted = [...annotations].sort((a, b) => a.start - b.start)
  const highlights = sorted.filter((a) => a.type === 'highlight')
  const labels = sorted.filter((a) => a.type === 'label')

  let body = `<h1 style="font-size:18px;font-weight:700;margin-bottom:4px;">Annotation Summary</h1>
<p style="font-size:12px;color:#888;margin-bottom:32px;">${sorted.length} annotation${sorted.length !== 1 ? 's' : ''}</p>`

  if (highlights.length > 0) {
    body += `<h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;margin-bottom:12px;">Highlights</h2>`
    highlights.forEach((ann, i) => {
      const swatch = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${ann.color};margin-right:6px;vertical-align:middle;"></span>`
      body += `<div style="margin-bottom:18px;padding:12px 16px;border-radius:6px;background:#f9f9f9;border-left:4px solid ${ann.color};">
  <div style="font-size:11px;color:#888;margin-bottom:6px;">${swatch}Highlight ${i + 1}</div>
  <div style="font-size:14px;font-style:italic;color:#333;margin-bottom:${ann.note ? 8 : 0}px;">&ldquo;${escapeHtml(ann.selectedText)}&rdquo;</div>
  ${ann.note ? `<div style="font-size:13px;color:#222;border-top:1px solid #e0e0e0;padding-top:8px;">${escapeHtml(ann.note)}</div>` : ''}
</div>`
    })
  }

  if (labels.length > 0) {
    body += `<h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;margin:24px 0 12px;">Character Tags</h2>`
    labels.forEach((ann) => {
      const lc = ann.labelColor || '#a6e3a1'
      body += `<div style="margin-bottom:12px;padding:10px 14px;border-radius:6px;background:#f9f9f9;border-left:4px solid ${lc};">
  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:${lc}33;color:${lc};margin-bottom:6px;display:inline-block;">${escapeHtml(ann.label)}</span>
  <div style="font-size:14px;font-style:italic;color:#333;margin-top:4px;">&ldquo;${escapeHtml(ann.selectedText)}&rdquo;</div>
  ${ann.note ? `<div style="font-size:13px;color:#222;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:8px;">${escapeHtml(ann.note)}</div>` : ''}
</div>`
    })
  }

  return wrapPage(body)
}

function appendCharacterProfiles(html, characters) {
  const profilesHTML = buildCharacterProfilesHTML(characters)
  // Insert before </body>
  return html.replace('</body></html>', profilesHTML + '</body></html>')
}

function buildCharacterProfilesHTML(characters) {
  let html = `<hr style="margin:40px 0;border:none;border-top:2px solid #ccc;"/>
<h2 style="font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555;margin-bottom:20px;">Character Profiles</h2>`

  for (const char of characters) {
    const color = char.color || '#a6e3a1'
    html += `<div style="margin-bottom:24px;padding:16px 20px;border-left:4px solid ${color};background:#f9f9f9;border-radius:0 8px 8px 0;">
  <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
    <span style="font-size:17px;font-weight:700;color:#222;">${escapeHtml(char.name)}</span>
    <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:${color}33;color:${color};border:1px solid ${color}66;text-transform:capitalize;">${escapeHtml(char.role)}</span>
    ${char.age ? `<span style="font-size:12px;color:#888;">Age ${escapeHtml(char.age)}</span>` : ''}
  </div>`

    if (char.appearance) {
      html += `<p style="font-size:13px;color:#333;margin:0 0 6px;"><strong>Appearance:</strong> ${escapeHtml(char.appearance)}</p>`
    }

    if (char.traits && char.traits.length > 0) {
      html += `<p style="font-size:13px;color:#333;margin:0 0 6px;"><strong>Traits:</strong> ${char.traits.map(escapeHtml).join(' · ')}</p>`
    }

    if (char.backstory) {
      html += `<p style="font-size:13px;color:#555;margin:8px 0 0;font-style:italic;line-height:1.7;">${escapeHtml(char.backstory)}</p>`
    }

    html += '</div>'
  }

  return html
}

function wrapPage(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Georgia,serif;font-size:14px;line-height:1.9;color:#222;padding:48px 64px;max-width:720px;margin:0 auto;}
</style></head><body>${body}</body></html>`
}

function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
