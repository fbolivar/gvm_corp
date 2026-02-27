# 🏭 PRP - Modernización: Módulo de Compras (Abastecimiento)

> **Estado**: ✅ COMPLETADO | **Fecha**: 2026-02-27
> **Concepto**: "Eficiencia en el Suministro"
> **Estética**: Cybertruck Industrial (Premium V3)

---

## 🎯 Objetivo
Transformar el módulo de Compras en un **Centro de Inteligencia de Abastecimiento**, optimizando la visualización de la cadena de suministro, el control de deudas con proveedores y la eficiencia en la recepción de mercancía.

---

## 🛠️ Componentes a Intervenir

### 1. Dashboard de Compras (`app/(main)/purchasing/page.tsx`)
*   **Visual**: Header de alto impacto con iconos industriales (`Truck`, `Box`, `Zap`).
*   **KPIs**: Tarjetas industriales con radio `[3.5rem]`, sombras premium y métricas de "Días de Inventario" o "Eficiencia de Recepción".
*   **Smart Purchasing**: Elevar el panel de IA a una estética de "Nodo de Control" con gradientes oscuros y micro-animaciones.

### 2. Órdenes de Compra (`PurchaseOrderList.tsx`)
*   **Visual**: Tabla ultra-redondeada (`rounded-[3.5rem]`) en fondo blanco.
*   **Identidad**: Tipografía mono para folios y estados de "Logística" (En camino, Recibido, Pendiente) con iconos de `Truck`.
*   **Acciones**: Botones tipo "Pod" con micro-interacciones de escala.

### 3. Facturas de Proveedores (`VendorBillList.tsx`)
*   **Visual**: Estética "Fiscal Secure" similar a Ventas pero con acentos en `amber-600` o `indigo-600`.
*   **Datos**: Foco en fechas de vencimiento y saldos pendientes para tesorería.
*   **Acciones**: Enlace rápido a Tesorería para pagos.

---

## 🎨 Paleta y Estilo
*   **Primario**: `slate-900` (Headers & Nodos de Control).
*   **Acento**: `amber-600` (Compras/Ordenes) y `emerald-600` (Recibido/Saldado).
*   **Bordes**: `rounded-[3rem]` a `rounded-[4rem]`.
*   **Sombras**: `shadow-premium` y `shadow-active`.

---

## 🔄 Fases de Ejecución

1.  **Fase 1**: Refactorización del Dashboard (`page.tsx`) - *Estructura y KPIs*.
2.  **Fase 2**: Modernización de `PurchaseOrderList.tsx` - *Gestión de Logística*.
3.  **Fase 3**: Modernización de `VendorBillList.tsx` - *Control de Pasivos*.
4.  **Fase 4**: Pulido de micro-interacciones y validación visual.

---

*PRP generado por Antigravity - El Cerebro de la Fábrica.*
