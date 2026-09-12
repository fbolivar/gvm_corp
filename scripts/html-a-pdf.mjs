// Convierte un documento HTML en PDF (A4) usando el Chromium de Playwright.
//
//   node scripts/html-a-pdf.mjs <entrada.html> <salida.pdf>
//
// El HTML de los artifacts viene sin <html>/<head>/<body> (los agrega el
// visor), así que aquí se envuelve antes de imprimir. Requiere red la primera
// vez para las fuentes de Google: ejecutar desde PowerShell.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
    console.error('Uso: node scripts/html-a-pdf.mjs <entrada.html> <salida.pdf>')
    process.exit(1)
}

const raw = fs.readFileSync(input, 'utf8')
const html = raw.trimStart().toLowerCase().startsWith('<!doctype')
    ? raw
    : `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body>${raw}</body></html>`

const tmp = path.join(path.dirname(output), '_para-pdf.html')
fs.writeFileSync(tmp, html, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage()
// pathToFileURL resuelve bien las rutas relativas y los espacios en Windows.
await page.goto(pathToFileURL(path.resolve(tmp)).href, { waitUntil: 'networkidle' })
// Las fuentes web deben estar listas antes de medir las páginas.
await page.evaluate(() => document.fonts.ready)
await page.emulateMedia({ media: 'print' })
await page.pdf({
    path: output,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '14mm', bottom: '15mm', left: '14mm' },
})
await browser.close()
fs.unlinkSync(tmp)

const kb = Math.round(fs.statSync(output).size / 1024)
console.log(`PDF generado: ${output} (${kb} KB)`)
