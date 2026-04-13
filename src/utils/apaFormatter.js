/**
 * Parse authors string "Smith, J., & Lee, K." → array of last names
 */
function parseLastNames(authors) {
  if (!authors || !authors.trim()) return []
  // Split on " & " first, then handle each author's last name
  const parts = authors.split(/\s*&\s*|\s*,\s*(?=\s*[A-Z])/)
  const lastNames = []
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    // Last name is everything before the first comma or the whole thing
    const lastName = trimmed.split(',')[0].trim()
    if (lastName) lastNames.push(lastName)
  }
  return lastNames
}

/**
 * Format in-text citation: (Smith & Lee, 2020)
 */
export function formatCitation(apa) {
  if (!apa) return ''
  const lastNames = parseLastNames(apa.authors)
  const year = apa.year || 'n.d.'

  let authorPart
  if (lastNames.length === 0) {
    authorPart = apa.title ? apa.title.substring(0, 20) : 'Unknown'
  } else if (lastNames.length === 1) {
    authorPart = lastNames[0]
  } else if (lastNames.length === 2) {
    authorPart = `${lastNames[0]} & ${lastNames[1]}`
  } else {
    authorPart = `${lastNames[0]} et al.`
  }

  return `(${authorPart}, ${year})`
}

/**
 * Get short label for source tab: "Smith (2020)" or filename fallback
 */
export function getShortTitle(apa, fallback) {
  if (!apa) return fallback || 'Untitled'
  const lastNames = parseLastNames(apa.authors)
  const year = apa.year
  if (lastNames.length === 0) return fallback || apa.title?.substring(0, 20) || 'Untitled'
  const authorPart = lastNames.length > 2 ? `${lastNames[0]} et al.` : lastNames[0]
  return year ? `${authorPart} (${year})` : authorPart
}

/**
 * Format full APA reference as array of {text, italic} segments for rendering.
 * Returns [{text: '...', italic: false}, {text: '...', italic: true}, ...]
 */
export function formatReference(apa) {
  if (!apa) return [{ text: 'Unknown source', italic: false }]
  const segs = []
  const t = (text) => segs.push({ text, italic: false })
  const i = (text) => segs.push({ text, italic: true })

  const authors = apa.authors || 'Unknown'
  const year = apa.year || 'n.d.'
  const title = apa.title || 'Untitled'

  switch (apa.type) {
    case 'journal': {
      t(`${authors}. (${year}). ${title}. `)
      if (apa.journal) i(apa.journal)
      if (apa.volume) { t(', '); i(apa.volume) }
      if (apa.issue) t(`(${apa.issue})`)
      if (apa.pages) t(`, ${apa.pages}`)
      t('.')
      if (apa.doi) t(` https://doi.org/${apa.doi}`)
      break
    }
    case 'book': {
      t(`${authors}. (${year}). `)
      i(title)
      t('.')
      if (apa.publisher) t(` ${apa.publisher}.`)
      break
    }
    case 'chapter': {
      t(`${authors}. (${year}). ${title}. In `)
      if (apa.editors) t(`${apa.editors} (Eds.), `)
      if (apa.bookTitle) i(apa.bookTitle)
      if (apa.pages) t(` (pp. ${apa.pages})`)
      t('.')
      if (apa.publisher) t(` ${apa.publisher}.`)
      break
    }
    case 'website': {
      t(`${authors}. (${year}). `)
      i(title)
      if (apa.siteName) t(`. ${apa.siteName}.`)
      if (apa.url) t(` ${apa.url}`)
      break
    }
    default: {
      t(`${authors}. (${year}). ${title}.`)
      if (apa.publisher) t(` ${apa.publisher}.`)
      if (apa.journal) { t(' '); i(apa.journal) }
      break
    }
  }

  return segs
}

/**
 * Build plain-text reference string (for PDF export)
 */
export function formatReferencePlain(apa) {
  return formatReference(apa).map((s) => s.text).join('')
}
