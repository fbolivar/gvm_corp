import { createOpenAI } from '@ai-sdk/openai'
import { streamText, type UIMessage, convertToModelMessages } from 'ai'

// Use OpenRouter as provider (OpenAI-compatible)
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const model = openrouter('meta-llama/llama-3.3-70b-instruct')

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const context = body.context || 'Modulo general'

    // AI SDK v6 sends UIMessage[] from useChat — convert to model messages
    const uiMessages: UIMessage[] = body.messages ?? []
    const modelMessages = await convertToModelMessages(uiMessages)

    const systemPrompt = `Eres AI GVM, asistente del ERP GVM Corp. Responde siempre en espanol, se conciso.

Puedes ayudar con:
- Como usar los modulos del ERP (ventas, inventario, contabilidad, nomina, compras, CRM, tesoreria, DIAN, produccion)
- Mejores practicas de gestion empresarial
- Redactar descripciones y textos de negocio
- Conceptos contables, tributarios y de nomina colombiana
- Guiar paso a paso en procesos del sistema

No tienes acceso a la base de datos. Si piden datos reales (ventas, inventario, saldos), indica en que seccion del sistema pueden consultarlos. No inventes cifras ni uses placeholders como [insertar...]. No generes URLs ni imagenes.

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
