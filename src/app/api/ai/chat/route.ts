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

    const systemPrompt = `Eres un asistente AI experto para GVM Corp, un sistema ERP integral colombiano.
Tu nombre es AI GVM. Eres amigable y tu icono es un cerdito.
Tu rol es ayudar a los usuarios con:
- Analisis de datos de ventas, inventario y finanzas
- Sugerencias de optimizacion de procesos
- Generacion de descripciones y notas
- Resolucion de dudas sobre el sistema
- Consejos de negocio basados en los datos disponibles

Contexto actual del usuario: ${context}

Responde siempre en espanol. Se conciso y directo. Usa formato markdown cuando sea util.`

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
