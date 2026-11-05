'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import {
  getAccess, getTenantId,
  fetchSales, fetchReceivables, fetchInventory, fetchTreasury,
  fetchPurchases, fetchCRM, fetchKpis,
} from '../services/businessData'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})
// Modelo de texto confirmado disponible en la cuenta de OpenRouter (el mismo del
// copiloto). On-demand, así que el costo está acotado.
const MODEL = 'meta-llama/llama-3.3-70b-instruct'

/**
 * Informe tipo "junta directiva": cruza los datos de TODAS las áreas que el
 * usuario puede ver y entrega recomendaciones priorizadas PARA APROBAR. On-demand
 * (solo al convocarla). SOLO LECTURA — nunca ejecuta ni modifica nada. Respeta
 * permisos vía getAccess (un área que el usuario no ve no entra al análisis).
 */
export async function generateBoardReportAction(): Promise<{ text?: string; areas?: string[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!process.env.OPENROUTER_API_KEY) return { error: 'La IA no está configurada' }

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return { error: 'Sin empresa asociada' }

  const access = await getAccess(supabase, user.id)
  const db = createAdminClient()

  const data: Record<string, unknown> = {}
  const areas: string[] = []
  try {
    if (access.sales) {
      data.ventas = await fetchSales(db, tenantId)
      data.cartera = await fetchReceivables(db, tenantId)
      areas.push('Ventas', 'Cartera')
    }
    if (access.inventory) { data.inventario = await fetchInventory(db, tenantId); areas.push('Inventario') }
    if (access.treasury) { data.tesoreria = await fetchTreasury(db, tenantId); areas.push('Tesorería') }
    if (access.purchasing) { data.compras = await fetchPurchases(db, tenantId); areas.push('Compras') }
    if (access.crm) { data.crm = await fetchCRM(db, tenantId); areas.push('CRM') }
    data.kpis = await fetchKpis(db, tenantId, access)
  } catch (e) {
    console.error('[generateBoardReportAction] fetch:', e)
    return { error: 'No se pudieron cargar los datos para la junta' }
  }

  if (areas.length === 0) {
    return { error: 'No tienes acceso a suficientes áreas para un análisis cruzado.' }
  }

  const prompt =
    `Eres la junta directiva con IA de GVM, empresa colombiana de medicina veterinaria (distribuidor B2B). ` +
    `Te paso los datos REALES de varias áreas. Haz un análisis CRUZADO (no por área aislada: conecta ventas, cartera, ` +
    `inventario, tesorería y compras entre sí) y entrega, en español colombiano:\n\n` +
    `1) SITUACIÓN GENERAL: 2-3 líneas con el estado del negocio hoy.\n` +
    `2) RECOMENDACIONES PRIORIZADAS (entre 3 y 6), cada una con este formato:\n` +
    `   • [PRIORIDAD: ALTA/MEDIA/BAJA] Título corto\n` +
    `     - Hallazgo: qué muestran los datos (cita cifras reales).\n` +
    `     - Por qué (cruce): cómo se relaciona con otra área (ej. "cartera vencida alta + caja baja => no subir compras").\n` +
    `     - Acción recomendada: qué hacer, concreto.\n` +
    `3) Cierra con: "Estas son propuestas; ninguna se ejecuta automáticamente. Apruébalas tú."\n\n` +
    `REGLAS: montos en pesos colombianos ($15.000.000). Básate SOLO en los datos entregados, NO inventes cifras. ` +
    `Si un área no viene en los datos, no hables de ella. Sé concreto y accionable, sin relleno.\n\n` +
    `DATOS POR ÁREA:\n${JSON.stringify(data)}`

  try {
    const { text } = await generateText({ model: openrouter(MODEL), prompt })
    return { text, areas }
  } catch (e) {
    console.error('[generateBoardReportAction] llm:', e)
    return { error: 'La IA no pudo generar el informe en este momento. Intenta de nuevo.' }
  }
}
