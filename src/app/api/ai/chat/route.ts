import { createOpenAI } from '@ai-sdk/openai'
import { streamText, type UIMessage, convertToModelMessages } from 'ai'

// Use OpenRouter as provider (OpenAI-compatible)
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const model = openrouter('meta-llama/llama-3.1-8b-instruct')

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const context = body.context || 'Modulo general'

    // AI SDK v6 sends UIMessage[] from useChat — convert to model messages
    const uiMessages: UIMessage[] = body.messages ?? []
    const modelMessages = await convertToModelMessages(uiMessages)

    const systemPrompt = `Eres AI GVM, asistente experto del ERP GVM Corp (sistema integral colombiano).
Eres amigable, conciso y profesional.

CAPACIDADES:
- Explicar como usar los modulos del sistema (ventas, inventario, contabilidad, nomina, compras, CRM, tesoreria, DIAN, produccion)
- Sugerir mejores practicas de gestion empresarial
- Ayudar a redactar descripciones, notas y textos de negocio
- Explicar conceptos contables, tributarios y de nomina colombiana
- Guiar al usuario paso a paso en procesos del ERP

LIMITACIONES IMPORTANTES:
- NO tienes acceso a la base de datos ni a datos reales del usuario
- NO puedes consultar ventas, inventario, saldos ni registros reales
- Si el usuario pide datos especificos (ej: "mis ventas del mes"), explicale donde encontrarlos en el sistema en vez de inventar numeros

REGLAS:
- NUNCA inventes datos, cifras, nombres de productos ni montos. Si no tienes el dato, di donde puede encontrarlo en el sistema
- NUNCA uses placeholders como [insertar...], [nombre], [cantidad], etc.
- NUNCA generes URLs, links ni imagenes
- Responde siempre en espanol
- Se conciso y directo
- Usa listas y negritas cuando sea util

El usuario esta en: ${context}`

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
    })

    return result.toTextStreamResponse()
  } catch (error: unknown) {
    console.error('[ai/chat] Error:', error)
    const msg = error instanceof Error ? error.message : 'Error del AI'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
