// Zebra Browser Print v3 HTTP API — runs on localhost when the app is installed
const BP_URL = 'http://localhost/ZWWW'

export interface ZebraDevice {
  uid: string
  connection: string
  model: string
  deviceType: string
}

export interface LabelData {
  sku: string
  name: string
  price?: number
}

export type LabelType = 'barcode' | 'qr'

// ─── Device discovery ───────────────────────────────────────────────────────

export async function getConnectedPrinter(): Promise<ZebraDevice | null> {
  try {
    const res = await fetch(`${BP_URL}/status`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return null
    const data: { printer?: ZebraDevice[] } = await res.json()
    return data.printer?.[0] ?? null
  } catch {
    return null
  }
}

// ─── ZPL generation ─────────────────────────────────────────────────────────

function esc(s: string): string {
  // ZPL doesn't support accented chars in standard fonts — replace common ones
  return s
    .replace(/[áàä]/gi, 'a')
    .replace(/[éèë]/gi, 'e')
    .replace(/[íìï]/gi, 'i')
    .replace(/[óòö]/gi, 'o')
    .replace(/[úùü]/gi, 'u')
    .replace(/[ñ]/gi, 'n')
    .replace(/[^A-Za-z0-9 .,:;/\-_*()$%&#@!+]/g, ' ')
}

export function generateZpl(data: LabelData, type: LabelType, qty: number): string {
  const sku = esc(data.sku)
  const name = esc(data.name)
  const shortName = name.length > 28 ? name.substring(0, 27) + '.' : name
  const priceStr = data.price ? `$ ${data.price.toLocaleString('es-CO')}` : ''

  // 50mm x 25mm label @ 203dpi → 406 x 203 dots
  const header = ['^XA', '^MMT', '^PW406', '^LL203', '^LS0']
  const footer = [`^PQ${qty},0,1,Y`, '^XZ']

  let body: string[]

  if (type === 'qr') {
    body = [
      `^FO5,5^BQN,2,5^FDQA,${sku}^FS`,
      `^FO125,12^ADN,22,14^FD${sku}^FS`,
      `^FO125,48^ADN,16,9^FD${shortName.substring(0, 22)}^FS`,
      priceStr ? `^FO125,78^ADN,18,11^FD${priceStr}^FS` : '',
    ]
  } else {
    // Code 128
    body = [
      `^FO10,8^BCN,72,N,N,N^FD${sku}^FS`,
      `^FO10,92^ADN,18,10^FD${sku}^FS`,
      `^FO10,118^ADN,16,9^FD${shortName}^FS`,
      priceStr ? `^FO10,148^ADN,16,9^FD${priceStr}^FS` : '',
    ]
  }

  return [...header, ...body.filter(Boolean), ...footer].join('\n')
}

// ─── Print via Browser Print ─────────────────────────────────────────────────

export async function sendToPrinter(
  printer: ZebraDevice,
  zpl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({
      uid: printer.uid,
      connection: printer.connection,
      data: zpl,
    })
    const res = await fetch(`${BP_URL}/write?${params}`, {
      signal: AbortSignal.timeout(5000),
    })
    return { success: res.ok }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error de conexión',
    }
  }
}

// ─── ZPL file download (fallback sin impresora) ──────────────────────────────

export function downloadZpl(zpl: string, sku: string) {
  const blob = new Blob([zpl], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `etiqueta-${sku}.zpl`
  a.click()
  URL.revokeObjectURL(url)
}
