import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Text Annotation Tool'
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

async function parseFileBuffer(filePath, buffer) {
  if (filePath.toLowerCase().endsWith('.pdf')) {
    return parsePdfBuffer(filePath, buffer)
  }
  return { filePath, data: buffer.toString('base64') }
}

async function parsePdfBuffer(filePath, buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0
  })

  const pdf = await loadingTask.promise
  const meta = await pdf.getMetadata().catch(() => null)
  const title = meta?.info?.Title || ''
  const author = meta?.info?.Author || ''
  const pages = []

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent({
        includeMarkedContent: false,
        disableNormalization: false
      })
      const pageText = reconstructPdfPageText(content.items)
      if (pageText) pages.push(pageText)
    } catch {
      // Skip problem pages
    }
  }

  const cleaned = cleanPDFText(pages.join('\n\n'))
  const header = [title, author ? `by ${author}` : ''].filter(Boolean).join('\n')
  return {
    filePath,
    text: header ? `${header}\n\n${cleaned}` : cleaned
  }
}

function reconstructPdfPageText(items) {
  const textItems = items
    .filter((item) => item && typeof item.str === 'string')
    .map((item) => normalizePdfItem(item))
    .filter((item) => item.str)

  if (textItems.length === 0) return ''

  textItems.sort((a, b) => {
    const yDiff = Math.abs(b.y - a.y)
    if (yDiff > Math.max(a.lineTolerance, b.lineTolerance)) return b.y - a.y
    return a.x - b.x
  })

  const lines = []
  for (const item of textItems) {
    const lastLine = lines[lines.length - 1]
    if (!lastLine || !belongsToLine(lastLine, item)) {
      lines.push(createLine(item))
      continue
    }
    appendToLine(lastLine, item)
  }

  const mergedLines = lines
    .map(finalizeLine)
    .filter((line) => line.text.trim())

  let pageText = ''
  for (let i = 0; i < mergedLines.length; i++) {
    const current = mergedLines[i]
    const next = mergedLines[i + 1]
    pageText += current.text
    if (!next) break

    const gap = current.y - next.y
    const paragraphBreak = gap > Math.max(current.height, next.height) * 1.35
    const hyphenated = /[-‐‑]$/.test(current.text)

    if (hyphenated) {
      pageText = pageText.replace(/[-‐‑]$/, '')
      continue
    }

    pageText += paragraphBreak ? '\n\n' : '\n'
  }

  return normalizeParagraphs(pageText)
}

function normalizePdfItem(item) {
  const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0]
  const x = Number(transform[4] || 0)
  const y = Number(transform[5] || 0)
  const height = Math.abs(Number(item.height || transform[0] || 12)) || 12
  const width = Number(item.width || 0)
  const str = item.str.replace(/\s+/g, ' ').trim()
  return { str, x, y, width, height, lineTolerance: Math.max(2.5, height * 0.45) }
}

function belongsToLine(line, item) {
  return Math.abs(line.y - item.y) <= Math.max(line.lineTolerance, item.lineTolerance)
}

function createLine(item) {
  return { y: item.y, x: item.x, text: item.str, lastRight: item.x + item.width, height: item.height, lineTolerance: item.lineTolerance }
}

function appendToLine(line, item) {
  const rawGap = item.x - line.lastRight
  const gapThreshold = Math.max(6, item.height * 0.45)
  const needsSpace = rawGap > gapThreshold && !line.text.endsWith(' ')
  const noSpaceBefore = /^[,.;:!?%)\]}]/.test(item.str)
  const noSpaceAfter = /[(\[{]$/.test(line.text)
  if (needsSpace && !noSpaceBefore && !noSpaceAfter) line.text += ' '
  line.text += item.str
  line.lastRight = Math.max(line.lastRight, item.x + item.width)
  line.height = Math.max(line.height, item.height)
  line.lineTolerance = Math.max(line.lineTolerance, item.lineTolerance)
}

function finalizeLine(line) {
  return {
    ...line,
    text: line.text
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([([{])\s+/g, '$1')
      .replace(/\s+([)\]}])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }
}

function normalizeParagraphs(text) {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

function cleanPDFText(raw) {
  const lines = raw.split('\n')
  const filtered = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) { filtered.push(''); continue }
    if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) continue
    if (/^\d+\s*\/\s*\d+$/.test(t)) continue
    if (/^https?:\/\/\S+$/i.test(t)) continue
    if (/^[\d\s\-|–—•·]+$/.test(t) && t.replace(/\D/g, '').length <= 4) continue
    filtered.push(t)
  }
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
}

// IPC: open a file dialog and return file contents
ipcMain.handle('open-file', async (event, filters) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  const buffer = await readFile(filePath)
  return parseFileBuffer(filePath, buffer)
})

// IPC: read a file by path (used by drag & drop)
ipcMain.handle('read-file-path', async (_event, filePath) => {
  const buffer = await readFile(filePath)
  return parseFileBuffer(filePath, buffer)
})

// IPC: save a file
ipcMain.handle('save-file', async (event, { defaultPath, data, encoding }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath,
    filters: defaultPath?.endsWith('.pdf')
      ? [{ name: 'PDF', extensions: ['pdf'] }, { name: 'All Files', extensions: ['*'] }]
      : [{ name: 'JSON', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }]
  })
  if (canceled || !filePath) return null
  const buf = encoding === 'base64' ? Buffer.from(data, 'base64') : Buffer.from(data, 'utf-8')
  await writeFile(filePath, buf)
  return filePath
})

// IPC: print an HTML string to PDF and return base64 bytes
ipcMain.handle('print-to-pdf', async (_event, html) => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true }
  })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  // Give page a moment to render fonts/layout
  await new Promise((r) => setTimeout(r, 400))
  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.75, right: 0.75 }
  })
  win.close()
  return pdfBuffer.toString('base64')
})
