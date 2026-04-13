import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Toolbar from './components/Toolbar'
import TextViewer from './components/TextViewer'
import AnnotationSidebar from './components/AnnotationSidebar'
import NoteModal from './components/NoteModal'
import ExportModal from './components/ExportModal'
import PasteModal from './components/PasteModal'
import EditModal from './components/EditModal'
import CharacterModal from './components/CharacterModal'
import WriteEditor from './components/WriteEditor'
import SourceTabs from './components/SourceTabs'
import ReferencesPanel from './components/ReferencesPanel'
import ApaSourceModal from './components/ApaSourceModal'
import { extractTextFromDocx } from './utils/docxParser'
import { formatReferencePlain } from './utils/apaFormatter'

const DEFAULT_CHARACTERS = [
  { id: uuidv4(), name: 'Protagonist', role: 'protagonist', color: '#a6e3a1', age: '', appearance: '', traits: [], backstory: '' },
  { id: uuidv4(), name: 'Antagonist', role: 'antagonist', color: '#f38ba8', age: '', appearance: '', traits: [], backstory: '' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('annotate')

  // ---- Multi-source state ----
  const [sources, setSources] = useState([])
  const [activeSourceId, setActiveSourceId] = useState(null)

  // Derived
  const activeSource = sources.find((s) => s.id === activeSourceId) || null
  const documentText = activeSource?.text || ''
  const annotations = activeSource?.annotations || []

  const [characters, setCharacters] = useState(DEFAULT_CHARACTERS)
  const [paperContent, setPaperContent] = useState('')

  // Modal state
  const [pendingAnnotation, setPendingAnnotation] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [focusedAnnId, setFocusedAnnId] = useState(null)
  const [editingAnnotationId, setEditingAnnotationId] = useState(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [editingCharacterId, setEditingCharacterId] = useState(null)

  // APA modal state
  const [showApaModal, setShowApaModal] = useState(false)
  const [editingApaSourceId, setEditingApaSourceId] = useState(null)

  const editorRef = useRef(null)

  // ---- Source CRUD ----
  const addSource = useCallback((source) => {
    setSources((prev) => [...prev, source])
    setActiveSourceId(source.id)
  }, [])

  const updateSourceApa = useCallback((id, apa) => {
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, apa } : s))
  }, [])

  const removeSource = useCallback((id) => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id)
      setActiveSourceId((cur) => cur === id ? (next[0]?.id || null) : cur)
      return next
    })
  }, [])

  // ---- Annotation actions (target active source) ----
  const addAnnotation = useCallback((ann) => {
    setSources((prev) => prev.map((s) =>
      s.id === activeSourceId
        ? { ...s, annotations: [...s.annotations, { id: uuidv4(), ...ann }] }
        : s
    ))
  }, [activeSourceId])

  const deleteAnnotation = useCallback((id) => {
    setSources((prev) => prev.map((s) =>
      s.id === activeSourceId
        ? { ...s, annotations: s.annotations.filter((a) => a.id !== id) }
        : s
    ))
  }, [activeSourceId])

  const updateAnnotation = useCallback((id, changes) => {
    setSources((prev) => prev.map((s) =>
      s.id === activeSourceId
        ? { ...s, annotations: s.annotations.map((a) => a.id === id ? { ...a, ...changes } : a) }
        : s
    ))
  }, [activeSourceId])

  // ---- Character actions ----
  const addCharacter = useCallback((data) => {
    setCharacters((prev) => [...prev, { id: uuidv4(), ...data }])
  }, [])

  const updateCharacter = useCallback((id, data) => {
    setCharacters((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c))
  }, [])

  const deleteCharacter = useCallback((id) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // ---- Story export ----
  const handleExportStory = async () => {
    if (!paperContent || paperContent === '<p><br></p>') {
      alert('Nothing to export — write something in the Write tab first.')
      return
    }
    try {
      const storyHTML = buildStoryHTML(paperContent, sources)
      const base64 = await window.electronAPI.printToPDF(storyHTML)
      await window.electronAPI.saveFile({ defaultPath: 'my-story.pdf', data: base64, encoding: 'base64' })
    } catch (e) {
      alert('Export failed: ' + e.message)
    }
  }

  // ---- File operations ----
  const handleSave = async () => {
    const project = { version: 3, sources, activeSourceId, characters, paperContent }
    const data = JSON.stringify(project, null, 2)
    await window.electronAPI.saveFile({ defaultPath: 'project.json', data, encoding: 'utf-8' })
  }

  const handleLoad = async () => {
    const result = await window.electronAPI.openFile([
      { name: 'All Files', extensions: ['*'] },
      { name: 'Annotation Project', extensions: ['json'] }
    ])
    if (!result) return
    try {
      const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0))
      const project = JSON.parse(new TextDecoder('utf-8').decode(bytes))

      if (project.version === 3) {
        // v3: native multi-source format
        setSources(project.sources || [])
        setActiveSourceId(project.activeSourceId || project.sources?.[0]?.id || null)
        setPaperContent(project.paperContent || '')
        if (project.characters) setCharacters(project.characters)
      } else {
        // v1/v2: wrap single documentText+annotations as one source
        const legacySource = {
          id: uuidv4(),
          text: project.documentText || '',
          annotations: project.annotations || [],
          apa: { type: 'journal', authors: '', year: '', title: '', journal: '', volume: '', issue: '', pages: '', doi: '', publisher: '', editors: '', bookTitle: '', siteName: '', url: '' },
          fileName: 'Imported document'
        }
        setSources([legacySource])
        setActiveSourceId(legacySource.id)
        setPaperContent(project.paperContent || '')
        if (project.characters) {
          setCharacters(project.characters)
        } else if (project.customLabels) {
          setCharacters(project.customLabels.map((l) => ({
            id: uuidv4(), name: l.name, role: 'other', color: l.color,
            age: '', appearance: '', traits: [], backstory: ''
          })))
        } else {
          setCharacters([])
        }
      }
    } catch (e) {
      alert('Failed to load project file: ' + e.message)
    }
  }

  const processFileAsNewSource = async (result) => {
    if (!result) return
    try {
      let text = ''
      let fileName = ''
      if (result.text !== undefined) {
        text = result.text
        fileName = result.filePath ? result.filePath.split(/[\\/]/).pop() : 'Dropped file'
      } else {
        const ext = result.filePath.split('.').pop().toLowerCase()
        fileName = result.filePath.split(/[\\/]/).pop()
        const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0))
        if (ext === 'txt') {
          text = new TextDecoder('utf-8').decode(bytes)
        } else if (ext === 'docx') {
          text = await extractTextFromDocx(bytes.buffer)
        } else {
          alert(`Unsupported file type: .${ext}\nSupported types: pdf, txt, docx`)
          return
        }
      }
      // Add as a new source (open APA modal after)
      const newSource = {
        id: uuidv4(),
        text,
        annotations: [],
        fileName,
        apa: { type: 'journal', authors: '', year: '', title: '', journal: '', volume: '', issue: '', pages: '', doi: '', publisher: '', editors: '', bookTitle: '', siteName: '', url: '' }
      }
      addSource(newSource)
    } catch (e) {
      alert('Failed to open file:\n' + e.message)
    }
  }

  const handleOpenFile = async () => {
    const result = await window.electronAPI.openFile([
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text, Word or PDF', extensions: ['txt', 'docx', 'pdf'] }
    ])
    await processFileAsNewSource(result)
  }

  // Drag & drop → add as new source
  useEffect(() => {
    const onDragOver = (e) => {
      e.preventDefault()
      if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true)
    }
    const onDragLeave = (e) => {
      if (e.relatedTarget === null) setIsDraggingOver(false)
    }
    const onDrop = async (e) => {
      e.preventDefault()
      setIsDraggingOver(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const filePath = window.electronAPI.getPathForFile(file)
      const result = await window.electronAPI.readFilePath(filePath)
      await processFileAsNewSource(result)
    }
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Selection handling from TextViewer ----
  const handleSelection = useCallback(({ start, end, selectedText, rect }) => {
    setPendingAnnotation({ start, end, selectedText, rect })
  }, [])

  const handlePopupHighlight = (color, note) => {
    if (!pendingAnnotation) return
    addAnnotation({
      start: pendingAnnotation.start,
      end: pendingAnnotation.end,
      selectedText: pendingAnnotation.selectedText,
      type: 'highlight',
      color,
      note: note || '',
      label: '',
      labelColor: ''
    })
    setPendingAnnotation(null)
  }

  const handlePopupLabel = () => {
    setPendingAnnotation((p) => ({ ...p, type: 'label' }))
  }

  const handleLabelSubmit = ({ label, labelColor, characterId, note }) => {
    if (!pendingAnnotation) return
    addAnnotation({
      start: pendingAnnotation.start,
      end: pendingAnnotation.end,
      selectedText: pendingAnnotation.selectedText,
      type: 'label',
      color: '',
      note: note || '',
      label: label || '',
      labelColor: labelColor || '',
      characterId: characterId || ''
    })
    setPendingAnnotation(null)
  }

  const handleLabelCancel = () => {
    setPendingAnnotation((p) => ({ ...p, type: undefined }))
  }

  const showLabelModal = pendingAnnotation && pendingAnnotation.type === 'label'

  // ---- APA modal handlers ----
  const handleApaModalSave = (source) => {
    if (editingApaSourceId) {
      // Editing existing source's APA only
      updateSourceApa(editingApaSourceId, source.apa)
    } else {
      // Adding new source
      addSource(source)
    }
    setShowApaModal(false)
    setEditingApaSourceId(null)
  }

  const handleApaModalCancel = () => {
    setShowApaModal(false)
    setEditingApaSourceId(null)
  }

  const editingApaSource = editingApaSourceId ? sources.find((s) => s.id === editingApaSourceId) : null

  return (
    <>
      {isDraggingOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-inner">
            <div className="drop-icon">📄</div>
            <div className="drop-label">Drop to open</div>
            <div className="drop-sub">PDF, TXT, or DOCX</div>
          </div>
        </div>
      )}

      <Toolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasDocument={sources.length > 0}
        onPaste={() => setShowPaste(true)}
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onLoad={handleLoad}
        onExport={() => setShowExport(true)}
        onClear={() => {
          if (activeSource) removeSource(activeSource.id)
        }}
      />

      <div className="main-area">
        {activeTab === 'annotate' && (
          <div className="annotate-area">
            <SourceTabs
              sources={sources}
              activeSourceId={activeSourceId}
              onSelect={setActiveSourceId}
              onAdd={() => { setEditingApaSourceId(null); setShowApaModal(true) }}
              onRemove={removeSource}
            />
            <div className="annotate-main">
              <TextViewer
                text={documentText}
                annotations={annotations}
                pendingAnnotation={pendingAnnotation && !pendingAnnotation.type ? pendingAnnotation : null}
                focusedAnnId={focusedAnnId}
                onSelection={handleSelection}
                onDismissPopup={() => setPendingAnnotation(null)}
                onPopupHighlight={handlePopupHighlight}
                onPopupLabel={handlePopupLabel}
                onEditAnnotation={(id) => setEditingAnnotationId(id)}
              />

              <AnnotationSidebar
                annotations={annotations}
                characters={characters}
                onFocus={(id) => setFocusedAnnId(id)}
                onEdit={(id) => setEditingAnnotationId(id)}
                onDelete={deleteAnnotation}
                onAddCharacter={() => { setEditingCharacterId(null); setShowCharacterModal(true) }}
                onEditCharacter={(id) => { setEditingCharacterId(id); setShowCharacterModal(true) }}
                onDeleteCharacter={deleteCharacter}
              />
            </div>
          </div>
        )}

        {activeTab === 'write' && (
          <div className="write-layout">
            <div className="write-main">
              <WriteEditor
                initialHTML={paperContent}
                onChange={setPaperContent}
                ref={editorRef}
              />
              <ReferencesPanel
                sources={sources}
                onInsertCitation={(cit) => editorRef.current?.insertAtSavedRange(cit, 'text')}
                onEditApa={(id) => { setEditingApaSourceId(id); setShowApaModal(true) }}
              />
            </div>
            <div className="write-char-sidebar">
              <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Characters</span>
                <button className="btn btn-accent" style={{ padding: '3px 10px', fontSize: 11 }} onClick={handleExportStory}>
                  Export PDF
                </button>
              </div>
              <div className="write-char-list">
                {characters.length === 0 && (
                  <div className="sidebar-empty">No characters yet. Add them in the Annotate tab.</div>
                )}
                {characters.map((char) => (
                  <div key={char.id} className="char-ref-card">
                    <span
                      className="char-role-badge"
                      style={{ background: char.color + '33', color: char.color, border: `1px solid ${char.color}66` }}
                    >
                      {char.role}
                    </span>
                    <strong>{char.name}{char.age ? <span className="char-meta">· {char.age}</span> : null}</strong>
                    {char.appearance && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{char.appearance}</div>
                    )}
                    {char.traits.length > 0 && (
                      <div className="char-traits">
                        {char.traits.map((t) => <span key={t} className="trait-tag">{t}</span>)}
                      </div>
                    )}
                    {char.backstory && (
                      <div className="char-backstory">{char.backstory}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showApaModal && (
        <ApaSourceModal
          editSource={editingApaSource}
          onSave={handleApaModalSave}
          onCancel={handleApaModalCancel}
        />
      )}

      {editingAnnotationId && (() => {
        const ann = annotations.find((a) => a.id === editingAnnotationId)
        return ann ? (
          <EditModal
            annotation={ann}
            characters={characters}
            onSave={(changes) => { updateAnnotation(editingAnnotationId, changes); setEditingAnnotationId(null) }}
            onCancel={() => setEditingAnnotationId(null)}
          />
        ) : null
      })()}

      {showLabelModal && (
        <NoteModal
          type="label"
          selectedText={pendingAnnotation.selectedText}
          characters={characters}
          onSubmit={handleLabelSubmit}
          onCancel={handleLabelCancel}
        />
      )}

      {showCharacterModal && (
        <CharacterModal
          initial={editingCharacterId ? characters.find((c) => c.id === editingCharacterId) : null}
          onSave={(data) => {
            if (editingCharacterId) {
              updateCharacter(editingCharacterId, data)
            } else {
              addCharacter(data)
            }
            setShowCharacterModal(false)
            setEditingCharacterId(null)
          }}
          onCancel={() => { setShowCharacterModal(false); setEditingCharacterId(null) }}
        />
      )}

      {showExport && (
        <ExportModal
          documentText={documentText}
          annotations={annotations}
          characters={characters}
          onClose={() => setShowExport(false)}
        />
      )}

      {showPaste && (
        <PasteModal
          onSubmit={(text) => {
            const newSource = {
              id: uuidv4(),
              text,
              annotations: [],
              fileName: 'Pasted text',
              apa: { type: 'journal', authors: '', year: '', title: '', journal: '', volume: '', issue: '', pages: '', doi: '', publisher: '', editors: '', bookTitle: '', siteName: '', url: '' }
            }
            addSource(newSource)
            setShowPaste(false)
          }}
          onCancel={() => setShowPaste(false)}
        />
      )}
    </>
  )
}

function buildStoryHTML(content, sources) {
  const refs = (sources || []).filter((s) => s.apa?.authors || s.apa?.title)
  const refsHTML = refs.length > 0
    ? `<hr style="margin:2em 0;border:none;border-top:1px solid #ccc;"/>
       <h2>References</h2>
       <div style="margin-top:1em;">
         ${refs.map((s) => `<p style="margin:.5em 0;padding-left:1.5em;text-indent:-1.5em;">${escapeHtml(formatReferencePlain(s.apa))}</p>`).join('')}
       </div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Georgia,serif;font-size:15px;line-height:1.9;color:#222;padding:64px 80px;max-width:720px;margin:0 auto;}
  h1{font-size:2em;margin:.67em 0;}
  h2{font-size:1.5em;margin:.75em 0;}
  h3{font-size:1.17em;margin:.83em 0;}
  blockquote{border-left:3px solid #89b4fa;margin:1em 0;padding:8px 16px;color:#555;font-style:italic;}
  ul{padding-left:1.5em;margin:.5em 0;}
  p{margin:.5em 0;}
</style></head><body>${content}${refsHTML}</body></html>`
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
