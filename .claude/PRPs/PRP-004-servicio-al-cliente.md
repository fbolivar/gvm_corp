# PRP-004: Módulo de Servicio Al Cliente (Customer 360)

> **Estado**: ✅ COMPLETADO
> **Dueño**: Cerebro de la Fábrica
> **Fecha**: 2026-02-18

---

## 🎯 Objetivo
Implementar un módulo de **Servicio al Cliente** que rompa los silos departamentales mediante la vinculación transaccional directa, automatización de RMAs/Créditos y una vista 360 del cliente impulsada por datos reales del ERP.

---

## 🏗️ Fases de Implementación (Assembly Line)

### Fase 1: Infraestructura y Modelado de Datos ✅
1.  **Migración SQL**: Crear tablas `support_tickets`, `ticket_interactions` y `ticket_audit_log`. ✅
2.  **Servicio Core**: Implementar `supportService.ts` con lógica de creación, asignación y auditoría. ✅
3.  **Integración Sidebar**: Registrar "Servicio Cliente" en el grupo MENU. ✅

### Fase 2: El "Killer Feature" - Vinculación Transaccional ✅
1.  **Widget Customer 360**: Panel lateral en el ticket que muestra LTV (Lifetime Value), facturas pendientes y nivel VIP del `party_id`. ✅
2.  **Selector de Referencia**: Capacidad de asociar un ticket a: ✅
    - Una Factura o Pedido (`documents`).
    - Un Producto concreto (`products`).
    - Un Proyecto (vía metadata/custom field).

### Fase 3: Automatización Operativa (RMA & Créditos) ✅
1.  **Flujo RMA**: Botón "Generar Entrada Almacén" que dispara un movimiento `IN` en `inventory_movements` si la categoría es RMA. (Lógica en service lista) ✅
2.  **Nota de Crédito**: Botón "Solicitar Nota Crédito" que crea un borrador de documento `CREDIT_NOTE` vinculado a la factura origen. (Lógica en service lista) ✅

### Fase 4: Colaboración y SLAs Dinámicos ✅
1.  **Menciones Éticas**: Sistema de notas internas con etiquetado de roles/usuarios y notificaciones en tiempo real (Campana de Notificaciones). ✅
2.  **Cálculo de SLA**: Lógica en servidor para asignar prioridad `CRITICAL` basándose en el LTV (Vista 360). ✅
3.  **Audit Log Visual**: Historial inmutable de cambios de estado y acciones operativas. ✅
4.  **Acciones Automatizadas**: Botones reales para RMA y Nota de Crédito integrados en el Panel 360. ✅

---

## 🎨 Design System (Golden Path)

| Elemento | Estilo Premium Light |
| :--- | :--- |
| **Dashboard** | Lista industrial de tickets con badges de SLA (Reloj en vivo) |
| **Ticket View** | Dos columnas: Izquierda (Chat/Interacciones), Derecha (Customer 360 + Transacciones) |
| **Badges de Estado** | `amber-50` (Pendiente), `emerald-50` (Resuelto), `rose-50` (Crítico) |

---

## 🔒 Seguridad (RBAC)
- **Agente**: Lectura/Escritura de tickets asignados. Lectura limitada de facturas vinculadas.
- **Supervisor**: Gestión total, aprobación de RMAs y Notas de Crédito.
- **Auditor**: Solo lectura de logs inmutables.

---

*Fábrica de Software: Construyendo el puente entre el cliente y la operación.*
