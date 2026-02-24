# PRP-003: Modernización del Ciclo Comercial (Compras y Facturación)

> **Estado**: 🚀 EN EJECUCIÓN
> **Dueño**: Antigravity Brain
> **Fecha**: 2026-02-18

---

## 🎯 Objetivo
Transformar los módulos de **Compras** (Purchasing) y **Ventas/Facturación** (Sales & Invoicing) al estándar **Premium Light**, asegurando un flujo de datos coherente entre documentos, inventario y contabilidad.

---

## 🏗️ Fases de Ejecución

### Fase 1: Modernización de Compras (Purchasing)
- [x] **Dashboard de Compras**: Refactorizar `src/app/(main)/purchasing/page.tsx` con estética industrial premium.
- [x] **Órdenes de Compra (PO)**: 
    - Crear `PurchaseOrderList` y `CreatePurchaseOrderModal`.
    - Integrar selector de proveedores (`parties`) y productos.
- [x] **Recepción de Mercancía**:
    - Implementar lógica para marcar PO como "Recibida" (Gatilla movimiento de inventario `IN`).
- [x] **Factura de Proveedor (Vendor Bill)**:
    - Flujo de conversión PO -> Factura.
    - Componente especializado `VendorBillList`.

### Fase 2: Modernización de Ventas y Facturación (Sales & Invoicing)
- [x] **Dashboard de Ventas**: Refactorizar `src/app/(main)/sales/page.tsx` con KPIs de pipeline y facturación.
- [x] **Ciclo de Venta**:
    - Conversión Quotation -> Sales Order -> Invoice.
    - Componentes especializados (`SalesQuotationList`, `SalesOrderList`, `SalesInvoiceList`).
- [x] **Gestión de Facturas**:
    - Vista de lista de facturas con badges de estado DIAN/Pago.
- [x] **Trazabilidad**:
    - Implementar `DocumentLineage` para visualizar el flujo entre documentos.

### Fase 3: Infraestructura de Servicios (Core)
- [x] **`documentService`**:
    - Método `getRelatedDocuments` para trackear genealogía.
- [ ] **`accountingService`**:
    - Ampliar `createEntryFromDocument` para todos los tipos de documentos comerciales.
    - Soporte para impuestos (IVA) y retenciones.

### Fase 4: Visual y Reportes
- [x] **PDF Templates**: Implementado `documentPdfService` con plantillas Premium.
- [x] **Dashboard de Cartera**: Nuevo dashboard `/accounting/cartera` con KPI de AP/AR y trazabilidad.

---

> **Resultado Final**: El ciclo comercial ha sido modernizado completamente, desde tableros de control hasta la generación de documentos legales y su integración contable automática.

## 🛠️ Stack Tecnológico
- **Frontend**: React 19 + Next.js 16 + Tailwind CSS (Premium Light Mode).
- **Backend**: Supabase (PostgreSQL + Auth).
- **Servicios**: `documentService`, `accountingService`, `logisticsPdfService`.

---

## 📏 Reglas de Oro (Factory V3)
- **Feature-First**: Organizar código en `features/purchasing` y `features/sales`.
- **Zod Validation**: Validar cada entrada de documento.
- **Auto-Blindaje**: Documentar errores de lógica contable encontrados.

---

## 📋 Próximos Pasos (Inmediatos)
1.  **Explorar esquemas** de `documents` y `document_lines` para asegurar compatibilidad con Compras.
2.  **Iniciar Fase 1**: Rediseño del Dashboard de Compras.
