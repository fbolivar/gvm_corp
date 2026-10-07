/**
 * Catálogo plano de módulos navegables de la app, para el buscador (Ctrl+K).
 * Permite que al escribir "ventas" el buscador liste los módulos y submódulos
 * y el usuario pueda ir directo a ellos (como WorldOffice).
 *
 * `keywords` incluye sinónimos en español para mejorar los aciertos.
 */
export interface AppModule {
    label: string;
    href: string;
    group: string;
    keywords: string;
}

export const APP_MODULES: AppModule[] = [
    // ── Comercial ──────────────────────────────────────────────
    { label: "Dashboard", href: "/dashboard", group: "Comercial", keywords: "inicio tablero panel resumen principal home indicadores" },
    { label: "Analítica / BI", href: "/analytics", group: "Comercial", keywords: "bi inteligencia negocios reportes indicadores kpi analitica" },
    { label: "Ventas BI", href: "/analytics/sales", group: "Comercial", keywords: "ventas analitica reporte comercial" },
    { label: "Financiero BI", href: "/analytics/financial", group: "Comercial", keywords: "financiero finanzas analitica" },
    { label: "Ventas", href: "/sales", group: "Comercial", keywords: "ventas comercial facturacion vender" },
    { label: "Cotizaciones", href: "/sales/quotations", group: "Ventas", keywords: "cotizacion cotizaciones presupuesto oferta" },
    { label: "Pedidos", href: "/sales/orders", group: "Ventas", keywords: "pedidos orden de pedido pedido de venta so" },
    { label: "Facturas de Venta", href: "/sales/invoices", group: "Ventas", keywords: "facturas factura venta facturacion" },
    { label: "Ventas Recurrentes", href: "/sales/recurring", group: "Ventas", keywords: "recurrentes suscripcion periodica" },
    { label: "Notas Crédito", href: "/sales/credit-notes", group: "Ventas", keywords: "nota credito devolucion nc" },
    { label: "Notas Débito", href: "/sales/debit-notes", group: "Ventas", keywords: "nota debito nd" },
    { label: "Inventario", href: "/inventory", group: "Comercial", keywords: "inventario stock bodega almacen existencias" },
    { label: "Productos", href: "/products", group: "Inventario", keywords: "productos articulos items referencias" },
    { label: "Movimientos de Inventario", href: "/inventory/new", group: "Inventario", keywords: "movimientos entrada salida ajuste inventario" },
    { label: "Bodegas", href: "/inventory/warehouses", group: "Inventario", keywords: "bodegas almacenes ubicaciones" },
    { label: "Traslados", href: "/inventory/transfers", group: "Inventario", keywords: "traslados transferencia entre bodegas" },
    { label: "Valoración de Inventario", href: "/accounting/reports/inventory-valuation", group: "Inventario", keywords: "valoracion inventario costo stock valorizado" },
    { label: "Lotes", href: "/inventory/lots", group: "Inventario", keywords: "lotes vencimiento fefo" },
    { label: "Análisis ABC", href: "/inventory/analysis", group: "Inventario", keywords: "analisis abc rotacion pareto" },
    { label: "Seriales", href: "/inventory/serials", group: "Inventario", keywords: "seriales numero de serie serial" },
    { label: "Importar Stock", href: "/inventory/import-stock", group: "Inventario", keywords: "importar stock cargar inventario excel" },
    { label: "CRM", href: "/crm", group: "Comercial", keywords: "crm clientes oportunidades embudo relaciones" },
    { label: "Leads / Prospectos", href: "/crm/leads", group: "CRM", keywords: "leads prospectos oportunidades" },
    { label: "Pipeline (Oportunidades)", href: "/crm/pipeline", group: "CRM", keywords: "pipeline embudo etapas oportunidades negocios deals seguimiento comercial" },
    { label: "Forecast de Compras", href: "/purchasing/forecast", group: "Compras", keywords: "forecast compras demanda pronostico ventas comercial abc planeacion" },
    { label: "Forecast", href: "/crm/forecast", group: "CRM", keywords: "forecast pronostico proyeccion ventas" },
    { label: "Soporte", href: "/support", group: "Comercial", keywords: "soporte tickets ayuda mesa de ayuda" },
    { label: "Tickets", href: "/support/tickets", group: "Soporte", keywords: "tickets casos soporte" },
    { label: "Terceros", href: "/parties", group: "Comercial", keywords: "terceros clientes proveedores contactos directorio" },
    { label: "Portal Cliente", href: "/client-portal", group: "Comercial", keywords: "portal cliente estado de cuenta" },
    { label: "Catálogo", href: "/catalog", group: "Comercial", keywords: "catalogo productos showroom" },
    { label: "Mi Nómina", href: "/my-payroll", group: "Comercial", keywords: "mi nomina desprendible certificado laboral" },

    // ── Operaciones ────────────────────────────────────────────
    { label: "Compras", href: "/purchasing", group: "Operaciones", keywords: "compras proveedores abastecimiento" },
    { label: "Órdenes de Compra", href: "/purchasing/orders", group: "Compras", keywords: "orden de compra oc compras" },
    { label: "Facturas de Compra", href: "/purchasing/bills", group: "Compras", keywords: "factura de compra proveedor cuentas por pagar" },
    { label: "Devoluciones de Compra", href: "/purchasing/returns", group: "Compras", keywords: "devoluciones compra proveedor" },
    { label: "Proveedores", href: "/purchasing/vendors", group: "Compras", keywords: "proveedores vendors" },
    { label: "Documentos", href: "/documents", group: "Operaciones", keywords: "documentos historico reportes todos" },
    { label: "Producción", href: "/production", group: "Operaciones", keywords: "produccion manufactura recetas ordenes" },
    { label: "Nómina", href: "/payroll", group: "Operaciones", keywords: "nomina empleados sueldos salarios liquidacion pagos" },
    { label: "Empleados", href: "/payroll/employees", group: "Nómina", keywords: "empleados trabajadores personal" },
    { label: "Liquidación de Nómina", href: "/payroll/settlement", group: "Nómina", keywords: "liquidacion nomina pago" },
    { label: "Nómina Consolidada", href: "/payroll/summary", group: "Nómina", keywords: "consolidada resumen nomina" },
    { label: "Seguridad Social", href: "/payroll/social-security", group: "Nómina", keywords: "seguridad social aportes pila" },
    { label: "Control de Asistencia", href: "/payroll/attendance", group: "Nómina", keywords: "asistencia marcaciones entrada salida" },
    { label: "Dispersión de Pagos", href: "/payroll/dispersion", group: "Nómina", keywords: "dispersion pagos banco" },
    { label: "Horas Extra", href: "/payroll/overtime", group: "Nómina", keywords: "horas extra recargo" },
    { label: "Ausencias / Vacaciones", href: "/payroll/absences", group: "Nómina", keywords: "ausencias vacaciones incapacidad permiso" },
    { label: "Turnos", href: "/payroll/schedules", group: "Nómina", keywords: "turnos horarios" },
    { label: "Terminales QR", href: "/payroll/terminals", group: "Nómina", keywords: "terminales qr kiosco marcacion" },
    { label: "Capacitación", href: "/payroll/training", group: "Nómina", keywords: "capacitacion formacion cursos" },
    { label: "Evaluación de desempeño", href: "/payroll/performance", group: "Nómina", keywords: "evaluacion desempeño periodo prueba anual incremento" },
    { label: "Contabilidad", href: "/accounting/reports", group: "Operaciones", keywords: "contabilidad reportes informes estados financieros" },
    { label: "Estado de Resultados (P&G)", href: "/accounting/reports/p-and-l", group: "Contabilidad", keywords: "estado de resultados pyg p&g perdidas ganancias" },
    { label: "Balance de Prueba", href: "/accounting/reports/trial-balance", group: "Contabilidad", keywords: "balance de prueba" },
    { label: "Balance General", href: "/accounting/reports/balance-sheet", group: "Contabilidad", keywords: "balance general situacion financiera" },
    { label: "Libro Auxiliar", href: "/accounting/reports/auxiliary", group: "Contabilidad", keywords: "libro auxiliar mayor" },
    { label: "Cartera (CxC)", href: "/accounting/cartera", group: "Contabilidad", keywords: "cartera cuentas por cobrar cxc aging" },
    { label: "Asientos Contables", href: "/accounting/entries", group: "Contabilidad", keywords: "asientos comprobantes contables" },
    { label: "Cuentas Contables (PUC)", href: "/accounting/accounts", group: "Contabilidad", keywords: "cuentas contables puc plan de cuentas" },
    { label: "Activos Fijos", href: "/accounting/fixed-assets", group: "Contabilidad", keywords: "activos fijos depreciacion" },
    { label: "Cierre de Periodos", href: "/accounting/period-close", group: "Contabilidad", keywords: "cierre periodos contable" },
    { label: "Presupuesto", href: "/budget", group: "Contabilidad", keywords: "presupuesto budget" },
    { label: "Logística", href: "/logistics", group: "Operaciones", keywords: "logistica despachos remisiones envios entregas" },
    { label: "Tesorería", href: "/treasury", group: "Operaciones", keywords: "tesoreria bancos caja flujo de caja" },
    { label: "Cajas Menores", href: "/treasury/petty-cash", group: "Tesorería", keywords: "caja menor gastos" },
    { label: "Flujo de Caja", href: "/treasury/cash-flow", group: "Tesorería", keywords: "flujo de caja proyeccion" },
    { label: "Pagos a Proveedores", href: "/treasury/vendor-payments", group: "Tesorería", keywords: "pagos proveedores dispersion ach" },
    { label: "Conciliación Bancaria", href: "/treasury/reconcile", group: "Tesorería", keywords: "conciliacion bancaria extracto" },
    { label: "Contratos", href: "/contracts", group: "Operaciones", keywords: "contratos acuerdos" },
    { label: "Portal Proveedores", href: "/vendor-portal", group: "Operaciones", keywords: "portal proveedores pagos" },

    // ── Herramientas ───────────────────────────────────────────
    { label: "Notificaciones", href: "/notifications", group: "Herramientas", keywords: "notificaciones alertas avisos campana" },
    { label: "Colaboración", href: "/collaboration", group: "Herramientas", keywords: "colaboracion chat mensajes equipo" },
    { label: "Importación", href: "/settings/import", group: "Herramientas", keywords: "importar importacion cargar datos excel" },
    { label: "Activos Corporativos", href: "/technology", group: "Herramientas", keywords: "tecnologia activos corporativos equipos computadores vehiculos muebles herramientas licencias seguros iot medicos servidores impresoras celulares" },
    { label: "DIAN", href: "/dian", group: "Herramientas", keywords: "dian facturacion electronica nomina electronica" },
    { label: "Nómina Electrónica", href: "/dian/payroll", group: "DIAN", keywords: "nomina electronica dian" },
    { label: "Configuración", href: "/settings", group: "Herramientas", keywords: "configuracion ajustes empresa settings" },
    { label: "Auditoría", href: "/settings/audit", group: "Herramientas", keywords: "auditoria registro log actividad" },
    { label: "Dimensiones", href: "/settings/dimensions", group: "Herramientas", keywords: "dimensiones centros de costo" },
    { label: "Monedas", href: "/settings/currencies", group: "Herramientas", keywords: "monedas divisas tasa de cambio" },
    { label: "Listas de Precios", href: "/settings/pricing", group: "Herramientas", keywords: "listas de precios tarifas" },
    { label: "Llaves API", href: "/settings/api-keys", group: "Herramientas", keywords: "api keys llaves integracion power bi" },
    { label: "Licencia", href: "/settings/license", group: "Herramientas", keywords: "licencia plan suscripcion" },
    { label: "Ayuda / Manual", href: "/help", group: "Herramientas", keywords: "ayuda manual soporte documentacion" },
    { label: "Academia", href: "/academy", group: "Herramientas", keywords: "academia cursos aprendizaje formacion" },
];

/** Filtra módulos por término (label, keywords o href). */
export function searchModules(query: string, limit = 8): AppModule[] {
    const s = query.trim().toLowerCase();
    if (!s) return [];
    const tokens = s.split(/\s+/).filter(Boolean);
    return APP_MODULES
        .map((m) => {
            const hay = `${m.label} ${m.keywords} ${m.href}`.toLowerCase();
            // Puntaje: coincidencia exacta de label primero, luego por tokens.
            let score = 0;
            if (m.label.toLowerCase().includes(s)) score += 10;
            for (const t of tokens) if (hay.includes(t)) score += 1;
            return { m, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((x) => x.m);
}
