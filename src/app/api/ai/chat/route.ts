// @ts-nocheck
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAccess, getTenantId,
  fetchSales, fetchInventory, fetchReceivables, fetchPayroll,
  fetchPurchases, fetchTreasury, fetchCRM, fetchKpis,
} from '@/features/ai/services/businessData'

// El copiloto consulta los datos con admin client (salta RLS). La autorización
// por rol se aplica AQUÍ con getAccess (ver aprendizaje CLAUDE.md 2026-11-04).
// Las lecturas viven en `@/features/ai/services/businessData` y las comparte con
// "Analizar con IA" por módulo.

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const model = openrouter('meta-llama/llama-3.3-70b-instruct')

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    const tenantId = await getTenantId(supabase, user.id)
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Sin tenant' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const context = body.context || 'Modulo general'
    const uiMessages = body.messages ?? []
    const recentMessages = uiMessages.slice(-6)
    const modelMessages = await convertToModelMessages(recentMessages)

    const systemPrompt = `Eres AI GVM, el copiloto inteligente del ERP GVM Corporation S.A.S. — empresa colombiana de medicina veterinaria.

CAPACIDADES:
- Tienes acceso a datos reales del negocio (ventas, inventario, cartera, nómina, compras, tesorería, CRM/pipeline, KPIs) SIEMPRE que el usuario tenga permiso.
- Conoces contabilidad colombiana (PUC), facturación DIAN, legislación laboral (CST) y mejores prácticas empresariales.

REGLAS:
- Responde SIEMPRE en español colombiano, tutea al usuario.
- Sé conciso pero completo. Usa bullets y números cuando muestres datos.
- Formatea montos en pesos colombianos con separador de miles (ej: $15.000.000).
- Cuando recibas datos, interprétalos para el usuario; no muestres JSON crudo.
- Si no tienes datos suficientes, dilo honestamente.
- SEGURIDAD: solo puedes mostrar datos de las áreas a las que el usuario tiene permiso. Si en el bloque de DATOS aparece "ACCESO DENEGADO" para un área, NO muestres ni estimes cifras de esa área: dile con respeto que no tienes autorización. Nunca reveles salarios, nómina ni saldos a quien no tenga acceso.
- Para acciones que no puedes ejecutar (crear factura, aprobar OC), indica al usuario dónde hacerlo en el sistema.

El usuario está en: ${context}`

    const lastUserMsg = uiMessages.filter(m => m.role === 'user').pop()
    const query = (lastUserMsg?.content ?? '').toString().toLowerCase()

    // SEGURIDAD: qué áreas puede ver ESTE usuario.
    const access = await getAccess(supabase, user.id)
    const db = createAdminClient()

    const dataBlocks: string[] = []
    const denied: string[] = []

    const needsSales = /vent|factur|ingreso|revenue/i.test(query)
    const needsInventory = /inventar|stock|product|lote|venc|agot|exist/i.test(query)
    const needsReceivables = /cartera|cobr|debe|pend|pago|mora|vencid/i.test(query)
    const needsPayroll = /nomin|emplead|salari|prestam|personal|sueldo/i.test(query)
    const needsPurchases = /compra|orden|proveedor|oc-|pedido/i.test(query)
    const needsTreasury = /tesorer|banco|saldo|cuenta|flujo|caja/i.test(query)
    const needsCRM = /pipeline|oportunid|lead|crm|prospect|client/i.test(query)
    const needsKPIs = /resumen|ejecutiv|kpi|indicador|dashboard|general|negocio|como va/i.test(query)

    try {
      if (needsKPIs) {
        dataBlocks.push(`RESUMEN EJECUTIVO (solo áreas que el usuario puede ver):\n${JSON.stringify(await fetchKpis(db, tenantId, access))}`)
      } else {
        if (needsSales) {
          if (access.sales) dataBlocks.push(`VENTAS:\n${JSON.stringify(await fetchSales(db, tenantId))}`)
          else denied.push('ventas')
        }
        if (needsInventory) {
          if (access.inventory) dataBlocks.push(`INVENTARIO:\n${JSON.stringify(await fetchInventory(db, tenantId))}`)
          else denied.push('inventario')
        }
        if (needsReceivables) {
          if (access.sales) dataBlocks.push(`CARTERA:\n${JSON.stringify(await fetchReceivables(db, tenantId))}`)
          else denied.push('cartera')
        }
        if (needsPayroll) {
          if (access.salaries) dataBlocks.push(`NÓMINA:\n${JSON.stringify(await fetchPayroll(db, tenantId))}`)
          else denied.push('nómina y salarios')
        }
        if (needsPurchases) {
          if (access.purchasing) dataBlocks.push(`COMPRAS:\n${JSON.stringify(await fetchPurchases(db, tenantId))}`)
          else denied.push('compras')
        }
        if (needsTreasury) {
          if (access.treasury) dataBlocks.push(`TESORERÍA:\n${JSON.stringify(await fetchTreasury(db, tenantId))}`)
          else denied.push('tesorería')
        }
        if (needsCRM) {
          if (access.crm) dataBlocks.push(`CRM/PIPELINE:\n${JSON.stringify(await fetchCRM(db, tenantId))}`)
          else denied.push('CRM')
        }
      }
    } catch (e) {
      console.error('[ai/chat] Data fetch error:', e)
    }

    if (denied.length > 0) {
      dataBlocks.push(
        `ACCESO DENEGADO: el usuario NO tiene permiso para ver: ${denied.join(', ')}. ` +
        `Dile amablemente que no tienes autorización para mostrarle esa información y que lo ` +
        `consulte con un administrador si la necesita. NO inventes ni estimes cifras de esas áreas.`,
      )
    }

    const dataContext = dataBlocks.length > 0
      ? `\n\n--- DATOS REALES DEL NEGOCIO (usa estos datos para responder) ---\n${dataBlocks.join('\n\n')}\n--- FIN DATOS ---`
      : ''

    const result = streamText({
      model,
      system: systemPrompt + dataContext,
      messages: modelMessages,
    })

    return result.toTextStreamResponse()
  } catch (error: unknown) {
    console.error('[ai/chat] Error:', error)
    const msg = error instanceof Error ? error.message : 'Error del AI'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
