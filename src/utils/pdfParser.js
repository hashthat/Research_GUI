/**
 * PDF text extraction is handled in the Electron main process via IPC.
 * This module is kept as a pass-through so imports don't break.
 * The actual parsing happens in electron/main.js using pdfjs-dist in Node.js mode.
 */
export async function extractTextFromPDF(arrayBuffer) {
  // Not used directly — main process returns text via IPC before this is called
  throw new Error('extractTextFromPDF should not be called directly')
}
