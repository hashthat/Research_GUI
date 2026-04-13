import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

const TOOLBAR_BUTTONS = [
  { label: 'B', title: 'Bold', cmd: 'bold', style: { fontWeight: 700 } },
  { label: 'I', title: 'Italic', cmd: 'italic', style: { fontStyle: 'italic' } },
  { label: 'H1', title: 'Heading 1', cmd: 'formatBlock', arg: 'H1' },
  { label: 'H2', title: 'Heading 2', cmd: 'formatBlock', arg: 'H2' },
  { label: 'H3', title: 'Heading 3', cmd: 'formatBlock', arg: 'H3' },
  { label: '• List', title: 'Bullet list', cmd: 'insertUnorderedList' },
]

const WriteEditor = forwardRef(function WriteEditor({ initialHTML, onChange }, ref) {
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)

  // Set initial HTML once on mount only
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHTML || '<p><br></p>'
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Continuously save cursor position while editor has focus
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || !editorRef.current) return
      const range = sel.getRangeAt(0)
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const handleBlur = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0)
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
  }

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const execFormat = useCallback((cmd, arg) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg || null)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }, [onChange])

  // Expose insertAtSavedRange for parent (insert quotes, etc.)
  useImperativeHandle(ref, () => ({
    insertAtSavedRange(content, type = 'html') {
      editorRef.current?.focus()
      const range = savedRangeRef.current
      if (range) {
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      }
      if (type === 'text') {
        document.execCommand('insertText', false, content)
      } else {
        document.execCommand('insertHTML', false, content)
      }
      if (editorRef.current) onChange(editorRef.current.innerHTML)
    }
  }), [onChange])

  return (
    <div className="write-editor-wrap">
      <div className="write-editor-toolbar">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            className="btn we-btn"
            title={btn.title}
            style={btn.style}
            onMouseDown={(e) => {
              e.preventDefault() // prevent editor losing focus
              execFormat(btn.cmd, btn.arg)
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="write-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        data-placeholder="Start writing your story…"
      />
    </div>
  )
})

export default WriteEditor
