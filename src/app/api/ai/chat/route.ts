// @ts-nocheck
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, type UIMessage, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const model = openrouter('meta-llama/llama-3.3-70b-instruct')

export const maxDuration = 60

// ─── Helper: get tenant_id from user ─────────────────────────────────────────

async function getTenantId(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.tenant_id ?? null
}

// ─── Business Query Tools ────────────────────────────────────────────────────

function createBusinessTools(tenantId: string) {
  const db = createAdminClient()

  return {
    query_sales_summary: {
      description: 'Consulta resumen de ventas: total facturado, cantidad de facturas, top clientes. Usa esto cuando pregunten por ventas, facturación, ingresos.',
      parameters: z.object({
        period: z.string().optional().describe('Período YYYY-MM. Si no se especifica, usa el mes actual.'),
      }),
      execute: async ({ period }) => {
        const mes = period || new Date().toISOString().substring(0, 7)
        const startDate = `${mes}-01`
        const endDate = `${mes}-31`

        const { data: invoices } = await db
          .from('documents')
          .select('id, number, total, status, party_id, issue_date, parties(legal_name)')
          .eq('tenant_id', tenantId)
          .eq('doc_type', 'INVOICE')
          .gte('issue_date', startDate)
          .lte('issue_date', endDate)
          .order('total', { ascending: false })
          .limit(50)

        const total = invoices?.reduce((s, i) => s + (Number(i.total) || 0), 0) ?? 0
        const count = invoices?.length ?? 0
        const accepted = invoices?.filter(i => i.status === 'ACCEPTED').length ?? 0
        const top5 = invoices?.slice(0, 5).map(i => ({
          factura: i.number,
          cliente: (i.parties as any)?.legal_name,
          total: Number(i.total),
          estado: i.status,
        }))

        return {
          periodo: mes,
          total_facturado: total,
          total_facturado_fmt: `$${total.toLocaleString('es-CO')}`,
          cantidad_facturas: count,
          facturas_aceptadas: accepted,
          top_5_facturas: top5,
        }
      },
    },

    query_inventory: {
      description: 'Consulta inventario: productos con stock, alertas de stock bajo, lotes por vencer. Usa esto cuando pregunten por inventario, stock, existencias, productos, lotes, vencimientos.',
      parameters: z.object({
        type: z.enum(['stock', 'low_stock', 'expiring_lots']).describe('stock=existencias, low_stock=bajo mínimo, expiring_lots=lotes por vencer'),
      }),
      execute: async ({ type }) => {
        if (type === 'stock') {
          const { data } = await db
            .from('product_stock')
            .select('qty, avg_cost, products(name, sku), warehouses(name)')
            .eq('tenant_id', tenantId)
            .gt('qty', 0)
            .order('qty', { ascending: false })
            .limit(20)

          return {
            tipo: 'Existencias actuales',
            productos: data?.map(s => ({
              producto: (s.products as any)?.name,
              sku: (s.products as any)?.sku,
              bodega: (s.warehouses as any)?.name,
              cantidad: Number(s.qty),
              costo_promedio: Number(s.avg_cost),
            })),
          }
        }

        if (type === 'low_stock') {
          const { data } = await db
            .from('product_stock')
            .select('qty, products(name, sku), warehouses(name)')
            .eq('tenant_id', tenantId)
            .lt('qty', 20)
            .gt('qty', 0)
            .order('qty', { ascending: true })
            .limit(15)

          return {
            tipo: 'Productos con stock bajo (< 20 unidades)',
            productos: data?.map(s => ({
              producto: (s.products as any)?.name,
              sku: (s.products as any)?.sku,
              bodega: (s.warehouses as any)?.name,
              cantidad: Number(s.qty),
            })),
          }
        }

        // expiring_lots
        const today = new Date().toISOString().split('T')[0]
        const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
        const { data } = await db
          .from('product_lots')
          .select('lot_number, qty, expiration_date, status, products(name, sku)')
          .eq('tenant_id', tenantId)
          .eq('status', 'ACTIVE')
          .lte('expiration_date', in30)
          .gte('expiration_date', today)
          .order('expiration_date', { ascending: true })
          .limit(15)

        return {
          tipo: 'Lotes que vencen en los próximos 30 días',
          lotes: data?.map(l => ({
            lote: l.lot_number,
            producto: (l.products as any)?.name,
            cantidad: Number(l.qty),
            vence: l.expiration_date,
          })),
        }
      },
    },

    query_receivables: {
      description: 'Consulta cartera por cobrar: facturas pendientes de pago, aging de cartera. Usa esto cuando pregunten por cartera, cuentas por cobrar, quién debe, pagos pendientes.',
      parameters: z.object({}),
      execute: async () => {
        const { data } = await db
          .from('documents')
          .select('number, total, due_date, issue_date, status, parties(legal_name)')
          .eq('tenant_id', tenantId)
          .eq('doc_type', 'INVOICE')
          .in('status', ['SENT', 'ACCEPTED', 'SIGNED'])
          .order('due_date', { ascending: true })
          .limit(30)

        const today = new Date()
        let total = 0
        let vencidas = 0
        const detalles = data?.map(d => {
          const monto = Number(d.total) || 0
          total += monto
          const due = d.due_date ? new Date(d.due_date) : null
          const diasVencido = due ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0
          if (diasVencido > 0) vencidas++
          return {
            factura: d.number,
            cliente: (d.parties as any)?.legal_name,
            total: monto,
            vencimiento: d.due_date,
            dias_vencido: diasVencido > 0 ? diasVencido : 0,
            estado: diasVencido > 0 ? 'VENCIDA' : 'VIGENTE',
          }
        })

        return {
          total_cartera: total,
          total_cartera_fmt: `$${total.toLocaleString('es-CO')}`,
          facturas_pendientes: data?.length ?? 0,
          facturas_vencidas: vencidas,
          detalle: detalles?.slice(0, 10),
        }
      },
    },

    query_payroll: {
      description: 'Consulta información de nómina: empleados activos, total salarios, préstamos activos, horas extra. Usa esto cuando pregunten por nómina, empleados, salarios, prestaciones.',
      parameters: z.object({}),
      execute: async () => {
        const { data: employees } = await db
          .from('employees')
          .select('id, salary, status, parties(legal_name)')
          .eq('tenant_id', tenantId)
          .eq('status', 'ACTIVE')

        const { data: loans } = await db
          .from('payroll_loans')
          .select('employee_id, amount_total, amount_paid, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'ACTIVE')

        const { data: overtime } = await db
          .from('overtime_requests')
          .select('employee_id, hours, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'APPROVED')

        const totalSalarios = employees?.reduce((s, e) => s + (Number(e.salary) || 0), 0) ?? 0
        const totalPrestamos = loans?.reduce((s, l) => s + (Number(l.amount_total) - Number(l.amount_paid)), 0) ?? 0
        const totalHorasExtra = overtime?.reduce((s, o) => s + (Number(o.hours) || 0), 0) ?? 0

        return {
          empleados_activos: employees?.length ?? 0,
          total_salarios_mensual: totalSalarios,
          total_salarios_fmt: `$${totalSalarios.toLocaleString('es-CO')}`,
          prestamos_activos: loans?.length ?? 0,
          saldo_prestamos: totalPrestamos,
          saldo_prestamos_fmt: `$${totalPrestamos.toLocaleString('es-CO')}`,
          horas_extra_aprobadas: totalHorasExtra,
          top_salarios: employees
            ?.sort((a, b) => (Number(b.salary) || 0) - (Number(a.salary) || 0))
            .slice(0, 5)
            .map(e => ({
              nombre: (e.parties as any)?.legal_name,
              salario: Number(e.salary),
            })),
        }
      },
    },

    query_purchases: {
      description: 'Consulta órdenes de compra: pendientes, aprobadas, recibidas, totales. Usa esto cuando pregunten por compras, proveedores, órdenes de compra.',
      parameters: z.object({}),
      execute: async () => {
        const { data } = await db
          .from('purchase_orders')
          .select('po_number, total, status, order_date, parties(legal_name)')
          .eq('tenant_id', tenantId)
          .order('order_date', { ascending: false })
          .limit(20)

        const byStatus: Record<string, number> = {}
        let total = 0
        data?.forEach(po => {
          const s = po.status || 'UNKNOWN'
          byStatus[s] = (byStatus[s] || 0) + 1
          total += Number(po.total) || 0
        })

        return {
          total_ordenes: data?.length ?? 0,
          valor_total: total,
          valor_total_fmt: `$${total.toLocaleString('es-CO')}`,
          por_estado: byStatus,
          ultimas_5: data?.slice(0, 5).map(po => ({
            numero: po.po_number,
            proveedor: (po.parties as any)?.legal_name,
            total: Number(po.total),
            estado: po.status,
            fecha: po.order_date,
          })),
        }
      },
    },

    query_treasury: {
      description: 'Consulta tesorería: saldos de cuentas bancarias, últimos movimientos. Usa esto cuando pregunten por bancos, saldos, flujo de caja, cuentas.',
      parameters: z.object({}),
      execute: async () => {
        const { data: accounts } = await db
          .from('treasury_accounts')
          .select('name, type, bank_name, currency, balance')
          .eq('tenant_id', tenantId)

        const { data: txns } = await db
          .from('treasury_transactions')
          .select('amount, transaction_type, date, description')
          .eq('tenant_id', tenantId)
          .order('date', { ascending: false })
          .limit(10)

        const totalCOP = accounts
          ?.filter(a => a.currency === 'COP')
          .reduce((s, a) => s + (Number(a.balance) || 0), 0) ?? 0

        return {
          cuentas: accounts?.map(a => ({
            nombre: a.name,
            tipo: a.type,
            banco: a.bank_name,
            moneda: a.currency,
            saldo: Number(a.balance),
          })),
          saldo_total_cop: totalCOP,
          saldo_total_fmt: `$${totalCOP.toLocaleString('es-CO')}`,
          ultimos_movimientos: txns?.map(t => ({
            fecha: t.date,
            tipo: t.transaction_type,
            monto: Number(t.amount),
            descripcion: t.description,
          })),
        }
      },
    },

    query_crm: {
      description: 'Consulta CRM: pipeline de oportunidades, leads, valor total del pipeline. Usa esto cuando pregunten por oportunidades, pipeline, leads, prospección, ventas futuras.',
      parameters: z.object({}),
      execute: async () => {
        const { data: opps } = await db
          .from('crm_opportunities')
          .select('name, value, probability, stage, expected_close_date, parties(legal_name)')
          .eq('tenant_id', tenantId)
          .order('value', { ascending: false })
          .limit(20)

        const { data: leads } = await db
          .from('leads')
          .select('name, company_name, status, source')
          .eq('tenant_id', tenantId)

        const pipelineValue = opps
          ?.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage))
          .reduce((s, o) => s + (Number(o.value) || 0), 0) ?? 0

        const wonValue = opps
          ?.filter(o => o.stage === 'CLOSED_WON')
          .reduce((s, o) => s + (Number(o.value) || 0), 0) ?? 0

        const byStage: Record<string, number> = {}
        opps?.forEach(o => { byStage[o.stage] = (byStage[o.stage] || 0) + 1 })

        const leadsByStatus: Record<string, number> = {}
        leads?.forEach(l => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1 })

        return {
          total_pipeline: pipelineValue,
          total_pipeline_fmt: `$${pipelineValue.toLocaleString('es-CO')}`,
          total_cerrado_ganado: wonValue,
          total_cerrado_fmt: `$${wonValue.toLocaleString('es-CO')}`,
          oportunidades_por_etapa: byStage,
          leads_por_estado: leadsByStatus,
          top_oportunidades: opps?.slice(0, 5).map(o => ({
            nombre: o.name,
            valor: Number(o.value),
            probabilidad: o.probability,
            etapa: o.stage,
            cliente: (o.parties as any)?.legal_name,
          })),
        }
      },
    },

    query_kpis: {
      description: 'Consulta KPIs ejecutivos: resumen general del negocio con métricas clave. Usa esto cuando pregunten por resumen, dashboard, cómo va el negocio, métricas, indicadores.',
      parameters: z.object({}),
      execute: async () => {
        const mes = new Date().toISOString().substring(0, 7)
        const startDate = `${mes}-01`

        const [invoices, pos, employees, stock, tickets] = await Promise.all([
          db.from('documents').select('total').eq('tenant_id', tenantId).eq('doc_type', 'INVOICE').gte('issue_date', startDate),
          db.from('purchase_orders').select('total').eq('tenant_id', tenantId).gte('order_date', startDate),
          db.from('employees').select('id, salary').eq('tenant_id', tenantId).eq('status', 'ACTIVE'),
          db.from('product_stock').select('qty').eq('tenant_id', tenantId).gt('qty', 0),
          db.from('support_tickets').select('status').eq('tenant_id', tenantId).in('status', ['OPEN', 'IN_PROGRESS']),
        ])

        const ventasMes = invoices.data?.reduce((s, i) => s + (Number(i.total) || 0), 0) ?? 0
        const comprasMes = pos.data?.reduce((s, p) => s + (Number(p.total) || 0), 0) ?? 0
        const nomina = employees.data?.reduce((s, e) => s + (Number(e.salary) || 0), 0) ?? 0

        return {
          periodo: mes,
          ventas_mes: ventasMes,
          ventas_fmt: `$${ventasMes.toLocaleString('es-CO')}`,
          compras_mes: comprasMes,
          compras_fmt: `$${comprasMes.toLocaleString('es-CO')}`,
          empleados_activos: employees.data?.length ?? 0,
          nomina_mensual: nomina,
          nomina_fmt: `$${nomina.toLocaleString('es-CO')}`,
          productos_en_stock: stock.data?.length ?? 0,
          tickets_abiertos: tickets.data?.length ?? 0,
          margen_bruto_estimado: ventasMes > 0 ? `${Math.round(((ventasMes - comprasMes) / ventasMes) * 100)}%` : 'N/A',
        }
      },
    },
  }
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tenantId = await getTenantId(user.id)
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Sin tenant' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const context = body.context || 'Modulo general'

    const uiMessages: UIMessage[] = body.messages ?? []
    const modelMessages = await convertToModelMessages(uiMessages)

    const systemPrompt = `Eres AI GVM, el copiloto inteligente del ERP GVM Corporation S.A.S. — empresa colombiana de medicina veterinaria.

CAPACIDADES:
- Tienes acceso a datos reales del negocio via herramientas (tools). ÚSALAS siempre que el usuario pregunte por datos, métricas o información del negocio.
- Puedes consultar: ventas, inventario, cartera, nómina, compras, tesorería, CRM/pipeline, KPIs ejecutivos.
- Conoces contabilidad colombiana (PUC), facturación DIAN, legislación laboral (CST), y mejores prácticas empresariales.

REGLAS:
- Responde SIEMPRE en español colombiano, tutea al usuario.
- Sé conciso pero completo. Usa formato con bullets y números cuando muestres datos.
- Formatea montos en pesos colombianos con separador de miles (ej: $15.000.000).
- Cuando uses una herramienta, interpreta los resultados para el usuario. No muestres JSON crudo.
- Si no tienes datos suficientes, dilo honestamente.
- Para acciones que no puedes ejecutar (crear factura, aprobar OC), indica al usuario dónde hacerlo en el sistema.

El usuario está en: ${context}`

    const tools = createBusinessTools(tenantId)

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      maxSteps: 3,
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
