/**
 * Given a plain text string and an array of annotations (each with start/end char offsets),
 * returns an array of segments:
 *   { text: string, annotations: Annotation[] }
 *
 * Overlapping annotations are handled by splitting at every boundary.
 */
export function buildSegments(text, annotations) {
  if (!text) return []
  if (!annotations || annotations.length === 0) {
    return [{ text, annotations: [] }]
  }

  // Collect all boundary points
  const points = new Set([0, text.length])
  for (const ann of annotations) {
    if (ann.start >= 0 && ann.end <= text.length && ann.start < ann.end) {
      points.add(ann.start)
      points.add(ann.end)
    }
  }

  const sorted = Array.from(points).sort((a, b) => a - b)
  const segments = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    const activeAnnotations = annotations.filter(
      (ann) => ann.start <= start && ann.end >= end && ann.start < ann.end
    )
    segments.push({ start, end, text: text.slice(start, end), annotations: activeAnnotations })
  }

  return segments
}

/**
 * Compute the character offset of a DOM node + offset within a container element.
 * Returns -1 if node is not inside the container.
 */
export function getCharOffset(container, node, nodeOffset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let total = 0
  let current
  while ((current = walker.nextNode())) {
    if (current === node) {
      return total + nodeOffset
    }
    total += current.textContent.length
  }
  return -1
}

/**
 * Blend multiple hex highlight colors into one rgba for overlapping highlights.
 */
export function blendColors(colors) {
  if (!colors || colors.length === 0) return 'transparent'
  if (colors.length === 1) return colors[0]
  // Simple average blend
  const parsed = colors.map(hexToRgb).filter(Boolean)
  if (parsed.length === 0) return 'transparent'
  const avg = parsed.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 }
  )
  return `rgb(${Math.round(avg.r / parsed.length)}, ${Math.round(avg.g / parsed.length)}, ${Math.round(avg.b / parsed.length)})`
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null
}
