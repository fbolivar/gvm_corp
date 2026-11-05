import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { createClient } from '@/lib/supabase/server'

// Fuente ÚNICA de las lecturas de datos para la IA (copiloto `/api/ai/chat` y
// "Analizar con IA" por módulo). Consulta con admin client (salta RLS), así que
// la autorización por rol vive en `getAccess` + el gate del llamador — NUNCA
// llamar a un fetcher sin haber verificado el permiso del módulo. Ver aprendizaje
// CLAUDE.md 2026-11-04.

type SessionClient = Awaited<ReturnType<typeof createClient>>
type DB = ReturnType<typeof createAdminClient>

// ─── Permisos ─────────────────────────────────────────────────────────────────

export const HIGH_LEVEL_ROLES = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin']

export interface Access {
  high: boolean
  sales: boolean
  inventory: boolean
  purchasing: boolean
  treasury: boolean
  crm: boolean
  payroll: boolean
  /** Ver salarios individuales: espeja la RLS real `can_view_payroll()` (= can_view('payroll')). */
  salaries: boolean
  support: boolean
}

export const NO_ACCESS: Access = {
  high: false, sales: false, inventory: false, purchasing: false,
  treasury: false, crm: false, payroll: false, salaries: false, support: false,
}

export async function getTenantId(supabase: SessionClient, userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('user_tenants').select('tenant_id').eq('user_id', userId).limit(1).maybeSingle()
  return (data?.tenant_id as string | undefined) ?? null
}

export async function getAccess(supabase: SessionClient, userId: string): Promise<Access> {
  const { data: ut } = await supabase
    .from('user_tenants').select('role, role_id, status').eq('user_id', userId).maybeSingle()
  if (!ut || (ut.status && ut.status !== 'active')) return NO_ACCESS
  if (HIGH_LEVEL_ROLES.includes((ut.role as string) || '')) {
    return { high: true, sales: true, inventory: true, purchasing: true, treasury: true, crm: true, payroll: true, salaries: true, support: true }
  }
  if (!ut.role_id) return NO_ACCESS
  const { data: perms } = await supabase
    .from('role_permissions').select('module_key, can_view').eq('role_id', ut.role_id)
  const view = new Set((perms ?? []).filter(p => p.can_view).map(p => p.module_key as string))
  return {
    high: false,
    sales: view.has('sales'),
    inventory: view.has('inventory'),
    purchasing: view.has('purchasing'),
    treasury: view.has('treasury'),
    crm: view.has('crm'),
    payroll: view.has('payroll'),
    salaries: view.has('payroll'),
    support: view.has('support'),
  }
}

// ─── Fetchers por módulo (admin client; gatear SIEMPRE antes de llamar) ─────────

export async function fetchSales(db: DB, tenantId: string, period?: string) {
  const mes = period || new Date().toISOString().substring(0, 7)
  const { data: invoices } = await db
    .from('documents')
    .select('number, total, status, issue_date, parties(legal_name)')
    .eq('tenant_id', tenantId).eq('doc_type', 'INVOICE')
    .gte('issue_date', `${mes}-01`).lte('issue_date', `${mes}-31`)
    .order('total', { ascending: false }).limit(50)
  const total = invoices?.reduce((s, i) => s + (Number(i.total) || 0), 0) ?? 0
  return {
    periodo: mes,
    total_facturado: total,
    cantidad_facturas: invoices?.length ?? 0,
    facturas_aceptadas: invoices?.filter(i => i.status === 'ACCEPTED').length ?? 0,
    top_5_facturas: invoices?.slice(0, 5).map(i => ({
      factura: i.number, cliente: (i.parties as any)?.legal_name, total: Number(i.total), estado: i.status,
    })),
  }
}

export async function fetchInventory(db: DB, tenantId: string) {
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const [stock, low, lots] = await Promise.all([
    db.from('product_stock').select('qty, avg_cost, products(name, sku), warehouses(name)')
      .eq('tenant_id', tenantId).gt('qty', 0).order('qty', { ascending: false }).limit(20),
    db.from('product_stock').select('qty, products(name, sku), warehouses(name)')
      .eq('tenant_id', tenantId).lt('qty', 20).gt('qty', 0).order('qty', { ascending: true }).limit(15),
    db.from('product_lots').select('lot_number, qty, expiration_date, products(name, sku)')
      .eq('tenant_id', tenantId).eq('status', 'ACTIVE')
      .lte('expiration_date', in30).gte('expiration_date', today)
      .order('expiration_date', { ascending: true }).limit(15),
  ])
  return {
    existencias_top: stock.data?.map(s => ({ producto: (s.products as any)?.name, sku: (s.products as any)?.sku, bodega: (s.warehouses as any)?.name, cantidad: Number(s.qty), costo_promedio: Number(s.avg_cost) })),
    stock_bajo: low.data?.map(s => ({ producto: (s.products as any)?.name, sku: (s.products as any)?.sku, bodega: (s.warehouses as any)?.name, cantidad: Number(s.qty) })),
    lotes_por_vencer_30d: lots.data?.map(l => ({ lote: l.lot_number, producto: (l.products as any)?.name, cantidad: Number(l.qty), vence: l.expiration_date })),
  }
}

export async function fetchReceivables(db: DB, tenantId: string) {
  const { data } = await db
    .from('documents').select('number, total, due_date, status, parties(legal_name)')
    .eq('tenant_id', tenantId).eq('doc_type', 'INVOICE')
    .in('status', ['SENT', 'ACCEPTED', 'SIGNED']).order('due_date', { ascending: true }).limit(30)
  const today = new Date()
  let total = 0, vencidas = 0
  const detalle = data?.map(d => {
    const monto = Number(d.total) || 0; total += monto
    const due = d.due_date ? new Date(d.due_date) : null
    const dias = due ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0
    if (dias > 0) vencidas++
    return { factura: d.number, cliente: (d.parties as any)?.legal_name, total: monto, vencimiento: d.due_date, dias_vencido: dias > 0 ? dias : 0, estado: dias > 0 ? 'VENCIDA' : 'VIGENTE' }
  })
  return { total_cartera: total, facturas_pendientes: data?.length ?? 0, facturas_vencidas: vencidas, detalle: detalle?.slice(0, 10) }
}

export async function fetchPayroll(db: DB, tenantId: string) {
  const [emp, loans, ot] = await Promise.all([
    db.from('employees').select('salary, parties(legal_name)').eq('tenant_id', tenantId).eq('status', 'ACTIVE'),
    db.from('payroll_loans').select('amount_total, amount_paid').eq('tenant_id', tenantId).eq('status', 'ACTIVE'),
    db.from('overtime_requests').select('hours').eq('tenant_id', tenantId).eq('status', 'APPROVED'),
  ])
  const totalSalarios = emp.data?.reduce((s, e) => s + (Number(e.salary) || 0), 0) ?? 0
  return {
    empleados_activos: emp.data?.length ?? 0,
    total_salarios_mensual: totalSalarios,
    prestamos_activos: loans.data?.length ?? 0,
    saldo_prestamos: loans.data?.reduce((s, l) => s + (Number(l.amount_total) - Number(l.amount_paid)), 0) ?? 0,
    horas_extra_aprobadas: ot.data?.reduce((s, o) => s + (Number(o.hours) || 0), 0) ?? 0,
    top_salarios: emp.data?.sort((a, b) => (Number(b.salary) || 0) - (Number(a.salary) || 0)).slice(0, 5)
      .map(e => ({ nombre: (e.parties as any)?.legal_name, salario: Number(e.salary) })),
  }
}

export async function fetchPurchases(db: DB, tenantId: string) {
  const { data } = await db.from('purchase_orders')
    .select('po_number, total, status, order_date, parties(legal_name)')
    .eq('tenant_id', tenantId).order('order_date', { ascending: false }).limit(20)
  const byStatus: Record<string, number> = {}
  let total = 0
  data?.forEach(po => { byStatus[po.status || 'UNKNOWN'] = (byStatus[po.status || 'UNKNOWN'] || 0) + 1; total += Number(po.total) || 0 })
  return {
    total_ordenes: data?.length ?? 0, valor_total: total, por_estado: byStatus,
    ultimas_5: data?.slice(0, 5).map(po => ({ numero: po.po_number, proveedor: (po.parties as any)?.legal_name, total: Number(po.total), estado: po.status, fecha: po.order_date })),
  }
}

export async function fetchTreasury(db: DB, tenantId: string) {
  const [acc, txns] = await Promise.all([
    db.from('treasury_accounts').select('name, type, bank_name, balance').eq('tenant_id', tenantId),
    db.from('treasury_transactions').select('amount, transaction_type, date, description').eq('tenant_id', tenantId).order('date', { ascending: false }).limit(10),
  ])
  const total = acc.data?.reduce((s, a) => s + (Number(a.balance) || 0), 0) ?? 0
  return {
    cuentas: acc.data?.map(a => ({ nombre: a.name, tipo: a.type, banco: a.bank_name, saldo: Number(a.balance) })),
    saldo_total_cop: total,
    ultimos_movimientos: txns.data?.map(t => ({ fecha: t.date, tipo: t.transaction_type, monto: Number(t.amount), descripcion: t.description })),
  }
}

export async function fetchCRM(db: DB, tenantId: string) {
  const [opps, leads] = await Promise.all([
    db.from('crm_opportunities').select('name, value, probability, stage, parties(legal_name)').eq('tenant_id', tenantId).order('value', { ascending: false }).limit(20),
    db.from('leads').select('status').eq('tenant_id', tenantId),
  ])
  const pipeline = opps.data?.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).reduce((s, o) => s + (Number(o.value) || 0), 0) ?? 0
  const byStage: Record<string, number> = {}
  opps.data?.forEach(o => { byStage[o.stage] = (byStage[o.stage] || 0) + 1 })
  const leadsByStatus: Record<string, number> = {}
  leads.data?.forEach(l => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1 })
  return {
    total_pipeline: pipeline, oportunidades_por_etapa: byStage, leads_por_estado: leadsByStatus,
    top_oportunidades: opps.data?.slice(0, 5).map(o => ({ nombre: o.name, valor: Number(o.value), probabilidad: o.probability, etapa: o.stage, cliente: (o.parties as any)?.legal_name })),
  }
}

export async function fetchKpis(db: DB, tenantId: string, access: Access) {
  const mes = new Date().toISOString().substring(0, 7)
  const startDate = `${mes}-01`
  const out: Record<string, unknown> = { periodo: mes }
  let ventasMes: number | null = null, comprasMes: number | null = null
  if (access.sales) {
    const { data } = await db.from('documents').select('total').eq('tenant_id', tenantId).eq('doc_type', 'INVOICE').gte('issue_date', startDate)
    ventasMes = data?.reduce((s, i) => s + (Number(i.total) || 0), 0) ?? 0
    out.ventas_mes = ventasMes
  }
  if (access.purchasing) {
    const { data } = await db.from('purchase_orders').select('total').eq('tenant_id', tenantId).gte('order_date', startDate)
    comprasMes = data?.reduce((s, p) => s + (Number(p.total) || 0), 0) ?? 0
    out.compras_mes = comprasMes
  }
  if (access.salaries) {
    const { data } = await db.from('employees').select('salary').eq('tenant_id', tenantId).eq('status', 'ACTIVE')
    out.empleados_activos = data?.length ?? 0
    out.nomina_mensual = data?.reduce((s, e) => s + (Number(e.salary) || 0), 0) ?? 0
  } else if (access.payroll) {
    const { data } = await db.from('employees').select('id').eq('tenant_id', tenantId).eq('status', 'ACTIVE')
    out.empleados_activos = data?.length ?? 0
  }
  if (access.inventory) {
    const { data } = await db.from('product_stock').select('qty').eq('tenant_id', tenantId).gt('qty', 0)
    out.productos_en_stock = data?.length ?? 0
  }
  if (access.support) {
    const { data } = await db.from('support_tickets').select('status').eq('tenant_id', tenantId).in('status', ['OPEN', 'IN_PROGRESS'])
    out.tickets_abiertos = data?.length ?? 0
  }
  if (ventasMes !== null && comprasMes !== null && ventasMes > 0) {
    out.margen_bruto_estimado = `${Math.round(((ventasMes - comprasMes) / ventasMes) * 100)}%`
  }
  return out
}
