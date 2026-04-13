import { useRef, useEffect, useCallback } from 'react'
import { buildSegments, getCharOffset, blendColors } from '../utils/annotationUtils'
import AnnotationPopup from './AnnotationPopup'

export default function TextViewer({
  text,
  annotations,
  pendingAnnotation,
  focusedAnnId,
  onSelection,
  onDismissPopup,
  onPopupHighlight,
  onPopupLabel,
  onEditAnnotation
}) {
  const viewerRef = useRef(null)

  // Scroll focused annotation into view
  useEffect(() => {
    if (!focusedAnnId || !viewerRef.current) return
    const el = viewerRef.current.querySelector(`[data-ann-id="${focusedAnnId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedAnnId])

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !viewerRef.current) return

    const range = sel.getRangeAt(0)
    const container = viewerRef.current

    // Check selection is inside viewer
    if (!container.contains(range.commonAncestorContainer)) return

    const start = getCharOffset(container, range.startContainer, range.startOffset)
    const end = getCharOffset(container, range.endContainer, range.endOffset)

    if (start < 0 || end <= start) return

    const selectedText = sel.toString()

    // Get position for popup
    const rects = range.getClientRects()
    const lastRect = rects[rects.length - 1]
    const rect = {
      top: lastRect.bottom + window.scrollY,
      left: lastRect.left + window.scrollX,
      bottom: lastRect.bottom,
      right: lastRect.right
    }

    onSelection({ start, end, selectedText, rect })
  }, [onSelection])

  if (!text) {
    return (
      <div className="text-viewer-wrap">
        <div className="empty-state">
          <h2>No document loaded</h2>
          <p>Paste text or open a .txt / .docx file to get started.</p>
        </div>
      </div>
    )
  }

  const segments = buildSegments(text, annotations)

  return (
    <div className="text-viewer-wrap" onClick={onDismissPopup}>
      <div
        className="text-viewer"
        ref={viewerRef}
        onMouseUp={(e) => { e.stopPropagation(); handleMouseUp() }}
        onClick={(e) => e.stopPropagation()}
      >
        {segments.map((seg, i) => {
          const allAnns = seg.annotations
          const bgColor = allAnns.length > 0
            ? blendColors(allAnns.map((a) => a.color || a.labelColor || '#a6e3a1'))
            : 'transparent'

          const isFocused = allAnns.some((a) => a.id === focusedAnnId)
          const annIds = allAnns.map((a) => a.id).join(' ')

          return (
            <span
              key={i}
              className="text-segment"
              data-ann-id={annIds}
              style={{
                backgroundColor: bgColor,
                outline: isFocused ? '2px solid var(--accent)' : 'none',
                outlineOffset: '1px',
                cursor: allAnns.length > 0 ? 'pointer' : 'text'
              }}
              onDoubleClick={(e) => {
                if (allAnns.length > 0) {
                  e.stopPropagation()
                  onEditAnnotation(allAnns[0].id)
                }
              }}
            >
              {seg.text}
            </span>
          )
        })}
      </div>

      {pendingAnnotation && (
        <AnnotationPopup
          rect={pendingAnnotation.rect}
          onHighlight={onPopupHighlight}
          onLabel={onPopupLabel}
          onDismiss={onDismissPopup}
        />
      )}
    </div>
  )
}
