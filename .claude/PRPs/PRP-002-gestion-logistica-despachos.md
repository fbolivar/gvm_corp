# PRP-002: Gestión Logística y Despachos (LogiTrack)

> **Estado**: ✅ COMPLETADO
> **Fecha**: 2026-02-18
> **Proyecto**: gvm_corp

---

## Objetivo

Implementar un sistema centralizado para la gestión de despachos, transporte y entregas físicas. El objetivo es permitir que un **Gestor Logístico** pueda transformar Órdenes de Venta en Despachos, asignar transportadoras, generar Guías de Remisión y realizar el seguimiento hasta la entrega final.

## Por Qué

| Problema | Solución |
|----------|----------|
| Desconexión entre la venta y la entrega física. | Vínculo directo entre Órdenes de Venta y Despachos. |
| Falta de control sobre transportadoras y guías. | Registro de transportadoras y números de seguimiento (tracking). |
| Necesidad de documentos de entrega no contables. | Generación de Remisiones (Packing Slips) en PDF. |
| Incertidumbre sobre el estado de la mercancía. | Pipeline de estados: Pendiente → Empacado → Despachado → Entregado. |

**Valor de negocio**: Reducción de errores en entregas, mejora en la atención al cliente con información de tracking y control exacto de tiempos de despacho.

## Qué

### Criterios de Éxito
- [x] Creación de un Despacho a partir de una Orden de Venta.
- [x] Gestión maestros de Transportadoras (Nombre, Nit, Contacto).
- [x] Generación automática de PDF para Guía de Remisión.
- [x] Dashboard de seguimiento logístico con KPIs de entregas.
- [x] Actualización de inventario automática (Basada en estado SHIPPED).

### Comportamiento Esperado (Happy Path)
1. El usuario navega a "Logística" y ve las Órdenes de Venta pendientes por despachar.
2. Selecciona una Orden y genera un "Nuevo Despacho".
3. El sistema precarga los ítems de la orden. El usuario puede hacer despachos parciales.
4. Selecciona una Transportadora de la lista y digita el número de guía asignado.
5. Imprime la Remisión para adjuntar al paquete.
6. Cambia el estado a "Despachado".
7. Cuando el transportista confirma, marca como "Entregado".

---

## Contexto

### Referencias
*   `src/features/sales/` - Fuente de las Órdenes de Venta.
*   `src/features/inventory/` - Para la integración de movimiento de stock.
*   `src/features/documents/` - Patrón para generación de PDFs y manejo de líneas.

### Arquitectura Propuesta (Feature-First)
```
src/features/logistics/
├── components/          # ShipmentList, CarrierForm, RemisionPDF, Dashboard
├── hooks/               # useShipments, useCarriers
├── services/            # logisticsService.ts, logisticsPdfService.ts
├── store/               # logisticsStore.ts
└── types/               # index.ts (Zod schemas)
```

---

## Blueprint (Assembly Line)

### Fase 1: Infraestructura y Maestros ✅
**Objetivo**: BD configurada y CRUD de Transportadoras funcional.

### Fase 2: Motor de Despachos ✅
**Objetivo**: Lógica para crear Despachos a partir de Órdenes de Venta existentes.

### Fase 3: Gestión de Remisiones y Tracking ✅
**Objetivo**: Pantalla de detalle de Despacho, impresión de PDF y actualización de Tracking.

### Fase 4: Integración y Dashboard ✅
**Objetivo**: DASHBOARD Logístico con métricas funcionales.

## 🔥 Aprendizajes (Auto-Blindaje)

### 2026-02-18: Error 23502 (Tenant_id Not-Null) en Upsert
- **Error**: El método `upsertCarrier` intentaba insertar/actualizar sin asegurar el `tenant_id`, lo que causaba violaciones de restricción NOT NULL cuando el contexto del usuario no estaba cargado o el query de `user_tenants` fallaba.
- **Fix**: Se implementó el helper `getTenantId` en `logisticsService` que fuerza la resolución del tenant antes de cualquier operación de escritura.
- **Aplicar en**: Todos los servicios que manejen entidades multi-tenant.

---

*Módulo de Logística versión 1.1 - Estabilidad y Premium PDF.*
