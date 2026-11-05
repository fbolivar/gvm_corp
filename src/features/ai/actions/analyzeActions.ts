'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import {
  getAccess, getTenantId, type Access,
  fetchSales, fetchReceivables, fetchInventory, fetchTreasury,
  fetchPurchases, fetchCRM, fetchPayroll, fetchKpis,
} from '../services/businessData'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})
const MODEL = 'meta-llama/llama-3.3-70b-instruct'

export type AnalyzableModule = 'general' | 'sales' | 'inventory' | 'treasury' | 'purchasing' | 'crm' | 'payroll'

const TITULO: Record<AnalyzableModule, string> = {
  general: 'resumen ejecutivo del negocio',
  sales: 'ventas y cartera',
  inventory: 'inventario (existencias, stock bajo y lotes por vencer)',
  treasury: 'tesorería y cartera',
  purchasing: 'compras y proveedores',
  crm: 'CRM, pipeline y oportunidades',
  payroll: 'nómina',
}

/**
 * Genera un análisis narrativo (solo lectura) de un módulo con sus datos reales.
 * Gated por el permiso del módulo — reusa el mismo criterio que el copiloto y la
 * RLS. NO escribe nada.
 */
export async function analyzeModuleAction(
  moduleKey: AnalyzableModule,
): Promise<{ text?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!process.env.OPENROUTER_API_KEY) return { error: 'La IA no está configurada' }

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return { error: 'Sin empresa asociada' }

  const access = await getAccess(supabase, user.id)
  const db = createAdminClient()

  // Gate + carga de datos por módulo. El "general" se filtra solo (fetchKpis solo
  // trae lo que el usuario puede ver), así que no requiere permiso específico.
  let data: unknown
  try {
    switch (moduleKey) {
      case 'general':
        data = await fetchKpis(db, tenantId, access); break
      case 'sales':
        if (!access.sales) return { error: 'No tienes permiso para ver Ventas' }
        data = { ventas: await fetchSales(db, tenantId), cartera: await fetchReceivables(db, tenantId) }; break
      case 'inventory':
        if (!access.inventory) return { error: 'No tienes permiso para ver Inventario' }
        data = await fetchInventory(db, tenantId); break
      case 'treasury':
        if (!access.treasury) return { error: 'No tienes permiso para ver Tesorería' }
        data = { tesoreria: await fetchTreasury(db, tenantId), cartera: await fetchReceivables(db, tenantId) }; break
      case 'purchasing':
        if (!access.purchasing) return { error: 'No tienes permiso para ver Compras' }
        data = await fetchPurchases(db, tenantId); break
      case 'crm':
        if (!access.crm) return { error: 'No tienes permiso para ver CRM' }
        data = await fetchCRM(db, tenantId); break
      case 'payroll':
        if (!access.salaries) return { error: 'No tienes permiso para ver Nómina/salarios' }
        data = await fetchPayroll(db, tenantId); break
      default:
        return { error: 'Módulo no soportado' }
    }
  } catch (e) {
    console.error('[analyzeModuleAction] fetch:', e)
    return { error: 'No se pudieron cargar los datos para el análisis' }
  }

  const prompt =
    `Eres el analista de negocio de GVM, empresa colombiana de medicina veterinaria. ` +
    `Analiza los siguientes datos REALES del área de ${TITULO[moduleKey]} y entrega, en español colombiano y de forma concisa:\n` +
    `1) 3 a 5 HALLAZGOS clave (lo más relevante de los datos).\n` +
    `2) RIESGOS o alertas que veas (cartera vencida, stock bajo, lotes por vencer, concentración, etc.).\n` +
    `3) 3 ACCIONES concretas recomendadas.\n` +
    `Reglas: usa viñetas, formatea montos en pesos colombianos ($15.000.000). ` +
    `Básate SOLO en los datos entregados, NO inventes cifras. Si los datos están vacíos, dilo.\n\n` +
    `DATOS:\n${JSON.stringify(data)}`

  try {
    const { text } = await generateText({ model: openrouter(MODEL), prompt })
    return { text }
  } catch (e) {
    console.error('[analyzeModuleAction] llm:', e)
    return { error: 'La IA no pudo generar el análisis en este momento. Intenta de nuevo.' }
  }
}
