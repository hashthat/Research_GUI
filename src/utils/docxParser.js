import mammoth from 'mammoth'

/**
 * Parse a .docx file (given as an ArrayBuffer) and return plain text.
 */
export async function extractTextFromDocx(arrayBuffer) {
  const result = await mammoth.extractRawValue({ arrayBuffer })
  return result.value
}
