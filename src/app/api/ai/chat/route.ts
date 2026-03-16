import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

// Use OpenRouter as provider (OpenAI-compatible)
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const model = openrouter('meta-llama/llama-3.1-8b-instruct')

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json()

    const systemPrompt = `Eres un asistente AI experto para GVM Corp, un sistema ERP integral colombiano.
Tu rol es ayudar a los usuarios con:
- Análisis de datos de ventas, inventario y finanzas
- Sugerencias de optimización de procesos
- Generación de descripciones y notas
- Resolución de dudas sobre el sistema
- Consejos de negocio basados en los datos disponibles

Contexto actual del usuario: ${context || 'Módulo general'}

Responde siempre en español. Sé conciso y directo. Usa formato markdown cuando sea útil.`

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
    })

    return result.toTextStreamResponse()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error del AI'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
