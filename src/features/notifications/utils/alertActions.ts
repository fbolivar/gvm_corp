/**
 * Etiqueta de la acción de 1 clic de una alerta, según a dónde lleva (`link`) y,
 * como respaldo, su categoría. Verbo concreto ("Reabastecer", "Conciliar") en vez
 * de un genérico "Tomar acción", para que el usuario sepa qué va a resolver.
 */
export function alertActionLabel(link?: string | null, category?: string | null): string {
    const l = (link ?? '').toLowerCase()

    if (l.includes('/inventory/lots')) return 'Gestionar lotes'
    if (l.includes('/inventory')) return 'Reabastecer'
    if (l.includes('/treasury/reconcile')) return 'Conciliar banco'
    if (l.includes('portfolio') || l.includes('cartera')) return 'Gestionar cartera'
    if (l.includes('/payroll/performance')) return 'Evaluar'
    if (l.includes('/payroll/attendance')) return 'Ver asistencia'
    if (l.includes('/accounting/period-close')) return 'Cerrar período'
    if (l.includes('/accounting/fixed-assets')) return 'Depreciar'
    if (l.includes('/contracts')) return 'Ver contratos'
    if (l.includes('/logistics')) return 'Ver despachos'
    if (l.includes('/sales/recurring')) return 'Generar facturas'
    if (l.includes('/documents')) return 'Ver documentos'
    if (l.includes('/analytics')) return 'Ver análisis'

    switch (category) {
        case 'BILLING': return 'Gestionar cartera'
        case 'INVENTORY': return 'Ver inventario'
        case 'LIQUIDITY': return 'Ver finanzas'
        case 'LOGISTICS': return 'Ver despachos'
        default: return 'Ver detalle'
    }
}
