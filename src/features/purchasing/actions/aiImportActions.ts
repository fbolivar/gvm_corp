'use server'

import { createClient } from '@/lib/supabase/server'
import { canViewModule } from '@/shared/lib/moduleGuard'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

// Extracción de facturas de compra con IA de visión (OpenRouter).
// SOLO extrae y devuelve un borrador: NO crea ni guarda nada. El usuario revisa
// y aprueba en el formulario normal de compras (DocumentForm). Gated por permiso
// del módulo Compras.

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

// Gemini 2.5 Flash: barato, con visión y maneja imágenes Y PDFs (confirmado
// disponible en la cuenta de OpenRouter). Bueno para leer documentos.
const VISION_MODEL = 'google/gemini-2.5-flash'

const lineSchema = z.object({
  description: z.string().describe('Descripción del producto o servicio del renglón'),
  sku: z.string().nullable().describe('Código/referencia del ítem si aparece'),
  qty: z.number().describe('Cantidad'),
  unit_price: z.number().describe('Valor unitario SIN IVA'),
  tax_rate: z.number().nullable().describe('Tarifa de IVA en % (0, 5 o 19); null si no se ve'),
})

const extractedSchema = z.object({
  supplier_name: z.string().nullable().describe('Razón social del PROVEEDOR que emite la factura'),
  supplier_nit: z.string().nullable().describe('NIT del proveedor, SOLO dígitos, sin dígito de verificación'),
  invoice_number: z.string().nullable().describe('Número de la factura'),
  issue_date: z.string().nullable().describe('Fecha de la factura en formato YYYY-MM-DD'),
  due_date: z.string().nullable().describe('Fecha de vencimiento YYYY-MM-DD si aparece'),
  currency: z.string().nullable().describe('Moneda (normalmente COP)'),
  lines: z.array(lineSchema),
  subtotal: z.number().nullable(),
  taxes: z.number().nullable().describe('Total de IVA'),
  total: z.number().nullable(),
})

export type ExtractedBill = z.infer<typeof extractedSchema>

const PROMPT = `Eres un asistente contable colombiano. Extrae los datos de esta FACTURA DE COMPRA (una factura que un PROVEEDOR le emite a la empresa).
Reglas estrictas:
- Montos como NÚMEROS, sin separador de miles ni símbolo (ej: 1250000.50). En Colombia el punto suele ser separador de miles: "1.250.000" = 1250000.
- NIT del proveedor: solo los dígitos, sin el dígito de verificación ni puntos.
- Fechas en formato YYYY-MM-DD.
- Cada renglón: descripción, código/referencia (sku) si existe, cantidad, valor unitario SIN IVA y tarifa de IVA (0, 5 o 19) si se ve.
- Si un dato NO está en el documento, usa null. NO lo inventes.
- Extrae únicamente al PROVEEDOR que emite; NO al comprador que recibe la factura.`

export async function extractVendorBillAction(
  fileDataUrl: string,
  mimeType: string,
): Promise<{ data?: ExtractedBill; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await canViewModule('purchasing'))) return { error: 'No tienes permiso para el módulo de Compras' }
  if (!process.env.OPENROUTER_API_KEY) return { error: 'La IA no está configurada (falta OPENROUTER_API_KEY)' }

  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'
  if (!isImage && !isPdf) return { error: 'Formato no soportado. Sube una imagen (JPG/PNG) o un PDF.' }

  const base64 = fileDataUrl.includes(',') ? fileDataUrl.split(',')[1] : fileDataUrl
  const approxBytes = Math.floor((base64?.length ?? 0) * 0.75)
  if (approxBytes > 8 * 1024 * 1024) return { error: 'El archivo es muy grande (máximo 8 MB).' }

  try {
    const { object } = await generateObject({
      model: openrouter(VISION_MODEL),
      schema: extractedSchema,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          isImage
            ? { type: 'image', image: fileDataUrl }
            : { type: 'file', data: base64, mediaType: 'application/pdf' },
        ],
      }] as never,
    })
    return { data: object }
  } catch (e) {
    console.error('[extractVendorBillAction]', e)
    return { error: 'No se pudo leer el documento. Intenta con una foto más nítida o un PDF legible.' }
  }
}
