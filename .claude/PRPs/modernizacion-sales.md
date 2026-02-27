# PRP: Modernización del Módulo de Ventas (Fábrica V3)

> **Estado**: ✅ COMPLETADO | **Fecha**: 2026-02-27 | **Estética**: Premium Quotations / Industrial

## 🎯 Objetivo
Elevar la experiencia visual del ciclo de ventas (Cotizaciones -> Pedidos -> Facturas) para reflejar precisión financiera y valor corporativo. Transformaremos las listas simples en un **Pipeline de Generación de Valor**.

## 🛠️ Alcance Técnico

### 1. `SalesDashboard` (`app/(main)/sales/page.tsx`)
- **Visual lift**: Ajustar los redondeados a `3rem` y `4rem`.
- **KPIs Industriales**: Mejorar las tarjetas de estadísticas con micro-interacciones más agresivas.
- **Centro de Operaciones**: Refinar los botones de acción rápida con estética "Pod" industrial.

### 2. `SalesQuotationList.tsx` (Propuestas de Alto Impacto)
- **Header "Value Proposal"**: Títulos en `font-black` itálica con iconos de `Target` y `Sparkles`.
- **Badges de Estado**: Implementar estados con gradientes y sombras que indiquen el progreso en el funnel.
- **Tabla de Precisión**: Aplicar `rounded-[3.5rem]` y `shadow-premium`.

### 3. `SalesOrderList.tsx` (Gestión de Compromiso)
- **Compromiso de Stock**: Añadir indicadores visuales de compromiso de mercancía.
- **Acceso Rápido**: Botones de "Facturar" con mayor peso visual.

### 4. `SalesInvoiceList.tsx` (Control de Recaudo)
- **Salud Financiera**: Resaltar los saldos pendientes con tipografía técnica `font-mono`.
- **Estados de Recaudo**: Badges de "Pagado", "Pendiente" y "Vencido" con colores vibrantes pero elegantes.

## 🎨 Design Tokens (Premium Sales)
- **Colores**: Amber 600 (Cotizaciones), Emerald 600 (Pedidos), Slate 900 (Facturas).
- **Redondeado**: `3.5rem` para contenedores principales, `1.5rem` para botones.
- **Tipografía**: Prioridad a `font-black italic` para valores monetarios.

## 🚀 Fases de Ejecución
1. **Fase 1**: Modernización del Dashboard `sales/page.tsx`.
2. **Fase 2**: Refactorización de `SalesQuotationList.tsx`.
3. **Fase 3**: Refactorización de `SalesOrderList.tsx` y `SalesInvoiceList.tsx`.
