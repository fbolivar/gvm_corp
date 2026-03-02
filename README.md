# GVM Corp ERP — Manual de Usuario

> Sistema de Gestión Empresarial integrado para GVM S.A.S.
> **Next.js 16 · Supabase · TypeScript · Colombia (DIAN v3)**

---

## Índice

1. [Acceso y Autenticación](#1-acceso-y-autenticación)
2. [Dashboard](#2-dashboard)
3. [Analytics e Inteligencia de Negocios](#3-analytics-e-inteligencia-de-negocios)
4. [Ventas](#4-ventas)
5. [Inventario](#5-inventario)
6. [Compras](#6-compras)
7. [CRM](#7-crm)
8. [Nómina](#8-nómina)
9. [Contabilidad](#9-contabilidad)
10. [Tesorería](#10-tesorería)
11. [Producción](#11-producción)
12. [Logística](#12-logística)
13. [Contratos](#13-contratos)
14. [Portal de Proveedores](#14-portal-de-proveedores)
15. [Portal Cliente](#15-portal-cliente)
16. [Centro de Alertas](#16-centro-de-alertas)
17. [GVM AI Assistant](#17-gvm-ai-assistant)
18. [Configuración](#18-configuración)
19. [Soporte](#19-soporte)
20. [Documentos & DIAN](#20-documentos--dian)
21. [Informes y Reportes](#21-informes-y-reportes)
22. [Roles y Permisos](#22-roles-y-permisos)
23. [Referencia Técnica](#23-referencia-técnica)

---

## 1. Acceso y Autenticación

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión con email y contraseña |
| `/signup` | Registro de nueva cuenta |

**Flujo de acceso:**
1. Ingresa a la aplicación con tu email y contraseña
2. El sistema verifica tu rol y permisos asignados
3. Eres redirigido al Dashboard principal

---

## 2. Dashboard

**Ruta:** `/dashboard`

Vista ejecutiva con KPIs en tiempo real:
- Facturación del mes vs mes anterior (tendencia)
- Cuentas por cobrar activas
- Órdenes de producción en curso
- Alertas críticas del sistema
- Accesos rápidos a los módulos más usados

---

## 3. Analytics e Inteligencia de Negocios

| Ruta | Descripción |
|------|-------------|
| `/analytics` | Centro de inteligencia — resumen ejecutivo |
| `/analytics/sales` | BI de Ventas — tendencias, canales, top clientes |
| `/analytics/financial` | BI Financiero — liquidez, EBITDA, supervivencia proyectada |

**Analytics de Ventas incluye:**
- Comparativa mes a mes y año a año
- Top 10 clientes por ingresos
- Top 10 productos más vendidos
- Proyección de ingresos

**Analytics Financiero incluye:**
- Días de supervivencia de caja
- Burn rate mensual
- Aging de cartera (30/60/90+ días)
- Métricas de liquidez

---

## 4. Ventas

### 4.1 Facturación

| Ruta | Descripción |
|------|-------------|
| `/sales/invoices` | Lista de facturas electrónicas |
| `/sales/invoices/new` | Crear nueva factura (DIAN integrado) |

**Crear una factura:**
1. Selecciona el cliente (tercero)
2. Agrega líneas de producto/servicio
3. Configura descuentos e impuestos (IVA, retenciones)
4. Envía a DIAN — se genera CUFE automáticamente
5. El cliente recibe el PDF por correo

**Estados de factura:** Borrador → Enviado → Aceptado (DIAN) → Pagado

### 4.2 Cotizaciones y Órdenes

| Ruta | Descripción |
|------|-------------|
| `/sales/quotations` | Lista de cotizaciones |
| `/sales/quotations/new` | Nueva cotización |
| `/sales/orders` | Órdenes de venta |
| `/sales/orders/new` | Nueva orden de venta |

**Flujo sugerido:** Cotización → Orden de Venta → Factura

### 4.3 Facturación Recurrente

| Ruta | Descripción |
|------|-------------|
| `/sales/recurring` | Plantillas de facturación automática |
| `/sales/recurring/new` | Nueva plantilla recurrente |

**Frecuencias disponibles:** Semanal · Quincenal · Mensual · Trimestral · Anual

**Cómo funciona:**
1. Crea una plantilla con las líneas de servicio
2. Define la frecuencia y fecha de inicio
3. El sistema alerta cuando es hora de generar la factura
4. Pulsa **Generar** para emitir la factura automáticamente

---

## 5. Inventario

| Ruta | Descripción |
|------|-------------|
| `/inventory` | Saldo de inventario por producto y bodega |
| `/inventory/new` | Registrar entrada/salida de mercancía |
| `/inventory/warehouses` | Gestión de bodegas |
| `/products` | Catálogo de productos |
| `/products/new` | Crear nuevo producto |

**Conceptos clave:**
- **Stock mínimo:** Define el punto de reorden; el sistema genera alertas automáticas cuando el stock baja del mínimo
- **Múltiples bodegas:** El inventario se gestiona por ubicación
- **Kardex:** Ver el historial completo de movimientos por producto (`/accounting/reports/kardex`)

---

## 6. Compras

| Ruta | Descripción |
|------|-------------|
| `/purchasing` | Dashboard de compras |
| `/purchasing/orders` | Órdenes de compra |
| `/purchasing/orders/new` | Nueva orden de compra |
| `/purchasing/bills` | Facturas de proveedor (CxP) |
| `/purchasing/bills/new` | Registrar factura de proveedor |
| `/purchasing/vendors` | Directorio de proveedores con métricas |

**Flujo de compra:**
1. Emite una Orden de Compra al proveedor
2. Al recibir la mercancía, acepta la orden (actualiza inventario)
3. Registra la factura del proveedor en Cuentas por Pagar
4. Programa el pago desde Tesorería

---

## 7. CRM

| Ruta | Descripción |
|------|-------------|
| `/crm` | Centro de gestión de relaciones |
| `/crm/leads` | Prospectos y oportunidades |
| `/crm/leads/new` | Nuevo lead |
| `/crm/pipeline` | Visualización Kanban del pipeline de ventas |
| `/parties` | Directorio de clientes y proveedores |
| `/parties/new` | Crear nuevo tercero |
| `/support/tickets` | Tickets de soporte al cliente |

**Pipeline de ventas:**
- Etapas configurables (Prospecto → Calificado → Propuesta → Negociación → Cerrado)
- Arrastrar y soltar entre etapas
- Valor potencial por etapa
- Probabilidad de cierre

---

## 8. Nómina

| Ruta | Descripción |
|------|-------------|
| `/payroll` | Centro de nómina |
| `/payroll/employees` | Directorio de empleados |
| `/payroll/employees/new` | Nuevo empleado |
| `/payroll/settlement` | Liquidación de nómina |
| `/payroll/settlement/termination` | Liquidación por retiro |
| `/payroll/social-security` | Planilla de seguridad social (PILA) |
| `/payroll/attendance` | Control de asistencia |
| `/payroll/finance` | Portal financiero de nómina |
| `/payroll/simulator` | Simulador de salarios |
| `/my-payroll` | Desprendible de pago (vista del empleado) |
| `/dian/payroll` | Transmisión nómina electrónica DIAN |

**Proceso de liquidación mensual:**
1. Registra novedades (incapacidades, horas extra, vacaciones)
2. Ejecuta la liquidación en `/payroll/settlement`
3. Revisa los desprendibles individuales
4. Genera la planilla PILA en `/payroll/social-security`
5. Transmite a DIAN en `/dian/payroll`

**Simulador de salarios:** Calcula el costo total del empleador (salario + prestaciones + seguridad social) antes de contratar.

---

## 9. Contabilidad

### 9.1 Activos Fijos

| Ruta | Descripción |
|------|-------------|
| `/accounting/fixed-assets` | Registro de activos fijos |
| `/accounting/fixed-assets/new` | Nuevo activo |

**Categorías:** Terreno · Edificio · Vehículo · Equipo · Muebles · Cómputo · Otro

**Método de depreciación:** Línea recta (NIC 16)

**Cómo depreciar:**
1. Desde la lista de activos, pulsa **Depreciar** en el activo correspondiente
2. Se registra automáticamente 1 mes de depreciación
3. La barra de progreso muestra el % depreciado acumulado
4. Al llegar al 100% el estado cambia a "Depreciado Total"

### 9.2 Cierre Contable del Período

**Ruta:** `/accounting/period-close`

**Checklist de cierre (6 ítems requeridos):**
- Facturas de venta revisadas
- Gastos y compras revisados
- Conciliación bancaria completada
- Depreciación del período registrada
- Nómina del período liquidada
- Asientos de ajuste aplicados

**Flujo de estados:** Abierto → En Cierre (todos los ítems marcados requeridos) → Cerrado

### 9.3 Presupuesto Anual

| Ruta | Descripción |
|------|-------------|
| `/accounting/budget` | Lista de presupuestos |
| `/accounting/budget/new` | Nuevo presupuesto anual |
| `/accounting/budget/[id]` | Spreadsheet interactivo |

**El spreadsheet muestra:**
- Fila **Presupuesto** (editable — haz clic en cualquier celda)
- Fila **Real** (calculado desde documentos reales)
- **Badge de varianza** con % de desviación por mes
- Categorías: Ingresos, Costo de Ventas, Gastos Admin, Gastos Ventas, Nómina, CAPEX

### 9.4 Asientos Contables

| Ruta | Descripción |
|------|-------------|
| `/accounting/entries` | Libro diario |
| `/accounting/entries/new` | Nuevo asiento manual |
| `/accounting/accounts` | Plan de cuentas (PUC) |

### 9.5 Cartera (Cuentas por Cobrar)

| Ruta | Descripción |
|------|-------------|
| `/accounting/cartera` | Dashboard de cartera |
| `/accounting/cartera/cobros` | Gestión de cobros |
| `/accounting/cartera/ai` | Análisis de cartera con IA |

---

## 10. Tesorería

| Ruta | Descripción |
|------|-------------|
| `/treasury` | Dashboard de tesorería |
| `/treasury/accounts` | Cuentas bancarias y cajas |
| `/treasury/accounts/new` | Nueva cuenta |
| `/treasury/new` | Registrar transacción |
| `/treasury/reconcile` | Centro de conciliación bancaria |

### Conciliación Bancaria

**Proceso:**
1. En `/treasury/reconcile`, verás los extractos bancarios pendientes (DRAFT)
2. Haz clic en un extracto para abrir el módulo de match
3. Empareja líneas del extracto con transacciones del sistema
4. Una vez conciliado todo, el estado cambia a COMPLETADO

**Reportes de tesorería:**
- Flujo de caja (`/accounting/reports/cash-flow`)
- Conciliación bancaria (`/accounting/reports/bank-reconciliation`)

---

## 11. Producción

| Ruta | Descripción |
|------|-------------|
| `/production` | Dashboard de producción |
| `/production/orders` | Órdenes de producción |
| `/production/orders/new` | Nueva orden |
| `/production/recipes/new` | Nueva receta/ficha técnica |

---

## 12. Logística

**Ruta:** `/logistics`

Gestión de despachos y envíos. Vinculado con órdenes de venta.

---

## 13. Contratos

| Ruta | Descripción |
|------|-------------|
| `/contracts` | Lista de todos los contratos |
| `/contracts/new` | Nuevo contrato |
| `/contracts/[id]` | Detalle y gestión del contrato |

**Tipos de contrato:** Servicios · Compraventa · Arrendamiento · Laboral · Consultoría · Otro

**Ciclo de vida:** Borrador → Activo → Suspendido / Terminado / Vencido

**Características:**
- Alertas automáticas 30 días antes del vencimiento
- Soporte de otrosíes / modificaciones
- Vinculación a tercero (cliente o proveedor)
- Control de valor, moneda y firmante
- Auto-renovación configurable

**Agregar un Otrosí:**
1. Abre el contrato en `/contracts/[id]`
2. En la sección "Otrosíes / Modificaciones", pulsa **Agregar**
3. Describe la modificación, fecha de vigencia y variación de valor
4. Guarda — quedará numerado secuencialmente

---

## 14. Portal de Proveedores

| Ruta | Descripción |
|------|-------------|
| `/vendor-portal` | Vista consolidada de todos los proveedores |
| `/vendor-portal/[partyId]` | Estado de cuenta individual del proveedor |

**El estado de cuenta por proveedor muestra:**
- KPIs: total órdenes, saldo por pagar, total pagado, monto vencido
- Lista de Órdenes de Compra con estado
- Lista de Facturas del proveedor con estado de pago y alertas de vencimiento
- Balance final (pendiente + vencido + pagado)

**Acciones rápidas desde el estado de cuenta:**
- Nueva OC al proveedor (pre-llenado)
- Registrar factura del proveedor (pre-llenado)
- Ver ficha completa del proveedor en el directorio

---

## 15. Portal Cliente

| Ruta | Descripción |
|------|-------------|
| `/client-portal` | Acceso al portal de clientes |
| `/portal/[partyId]` | Vista pública del cliente (acceso por link) |
| `/portal/pago/[id]` | Portal de pago en línea |

Los clientes pueden ver sus facturas pendientes y acceder a sus documentos mediante un link seguro sin necesidad de crear una cuenta.

---

## 16. Centro de Alertas

**Ruta:** `/notifications`

Sistema de alertas inteligentes con detección automática de riesgos.

### Alertas disponibles (11 checks automáticos)

| Alerta | Prioridad | Módulo |
|--------|-----------|--------|
| Riesgo de liquidez (< 15 días supervivencia) | CRÍTICA | Finanzas |
| Pico logístico (> 20 órdenes pendientes despacho) | ALTA | Logística |
| Cartera crítica (> $5M en 90+ días) | ALTA | Cartera |
| Stock crítico (por debajo del mínimo) | ALTA | Inventario |
| Facturas vencidas por cobrar | ALTA | Ventas |
| Pagos a proveedor esta semana | MEDIA | Compras |
| Facturas recurrentes por generar | ALTA | Ventas |
| Extractos bancarios sin conciliar | MEDIA | Tesorería |
| Períodos contables en cierre pendiente | ALTA | Contabilidad |
| Activos fijos sin depreciar (30+ días) | MEDIA | Activos Fijos |
| Contratos por vencer en 30 días | ALTA | Contratos |

### Cómo usar el Centro de Alertas

1. La campana en el sidebar muestra el contador de alertas no leídas en tiempo real
2. Haz clic en **Diagnóstico** para ejecutar todos los checks manualmente
3. Las alertas CRÍTICA y ALTA disparan un toast emergente en toda la app
4. Usa los filtros: **Todas · Sin leer · Críticas**
5. Cada alerta tiene un link directo al módulo afectado

---

## 17. GVM AI Assistant

**Ruta:** `/ai-assistant`

Asistente de IA integrado para consultas de negocio, análisis de datos y generación de reportes en lenguaje natural.

---

## 18. Configuración

| Ruta | Descripción |
|------|-------------|
| `/settings` | Panel de configuración general |
| `/settings/company` | Datos de la empresa (NIT, dirección, logo) |
| `/settings/team` | Gestión de usuarios y roles |
| `/settings/profile` | Perfil del usuario actual |
| `/settings/security` | Cambio de contraseña y seguridad |
| `/settings/notifications` | Preferencias de notificaciones |
| `/settings/activity` | Auditoría — historial de acciones |
| `/settings/import` | Importación de datos (CSV) |
| `/settings/language` | Idioma de la interfaz |
| `/settings/integrations` | Integraciones con servicios externos |

### Gestión de Equipo (`/settings/team`)

**3 pestañas:**

1. **Miembros** — Invitar usuarios, cambiar roles, desactivar acceso
2. **Roles & Permisos** — Configurar qué puede hacer cada rol (28 roles disponibles)
3. **Zonas** — Definir zonas geográficas de cobertura

**Roles disponibles:**
SUPER ADMINISTRADOR · ADMINISTRADOR · GERENTE GENERAL · CONTADOR · AUXILIAR CONTABLE · VENDEDOR SENIOR/JUNIOR · COMPRADOR · JEFE DE BODEGA · AUXILIAR DE BODEGA · JEFE DE PRODUCCIÓN · OPERARIO · JEFE DE NÓMINA · ANALISTA DE NÓMINA · TESORERO · JEFE DE LOGÍSTICA · COORDINADOR CRM · ASESOR SOPORTE · AUDITOR · y más

---

## 19. Soporte

| Ruta | Descripción |
|------|-------------|
| `/support` | Dashboard de soporte |
| `/support/tickets` | Lista de tickets abiertos |
| `/support/tickets/new` | Crear nuevo ticket |
| `/support/tickets/[id]` | Detalle y chat del ticket |
| `/help` | Centro de ayuda |
| `/collaboration` | Espacio de colaboración interna |

---

## 20. Documentos & DIAN

| Ruta | Descripción |
|------|-------------|
| `/documents` | Repositorio de todos los documentos electrónicos |
| `/documents/new` | Crear documento genérico |
| `/dian` | Centro de integración DIAN |
| `/dian/payroll` | Nómina electrónica DIAN |

**Tipos de documento:**
- INVOICE (Factura de venta)
- CREDIT_NOTE (Nota crédito)
- DEBIT_NOTE (Nota débito)
- PURCHASE_ORDER (Orden de compra)
- VENDOR_BILL (Factura de proveedor)
- PAYROLL (Comprobante de nómina)
- QUOTATION (Cotización)
- SALES_ORDER (Orden de venta)

---

## 21. Informes y Reportes

**Ruta base:** `/accounting/reports`

### Reportes Financieros (PYG / Balance)

| Reporte | Ruta |
|---------|------|
| Estado de Resultados (P&L) | `/accounting/reports/p-and-l` |
| Balance General | `/accounting/reports/balance-sheet` |
| Balance de Prueba | `/accounting/reports/trial-balance` |
| Cambios en el Patrimonio | `/accounting/reports/equity-changes` |
| Flujo de Caja | `/accounting/reports/cash-flow` |
| Libro Diario | `/accounting/reports/journal` |
| Libro Mayor Auxiliar | `/accounting/reports/auxiliary` |
| Libro Mayor General | `/accounting/reports/general-ledger` |

### Reportes de Cartera

| Reporte | Ruta |
|---------|------|
| Aging Cuentas por Cobrar | `/accounting/reports/aging-receivable` |
| Aging Cuentas por Pagar | `/accounting/reports/aging-payable` |
| Facturas Emitidas | `/accounting/reports/invoices-issued` |
| Notas Crédito | `/accounting/reports/credit-note` |

### Reportes de Inventario

| Reporte | Ruta |
|---------|------|
| Kardex | `/accounting/reports/kardex` |
| Valoración de Inventario | `/accounting/reports/inventory-valuation` |
| Inventario de Baja Rotación | `/accounting/reports/slow-movers` |

### Reportes de Nómina

| Reporte | Ruta |
|---------|------|
| Resumen de Nómina | `/accounting/reports/payroll-summary` |
| Costo del Empleador | `/accounting/reports/employer-cost` |
| Provisión de Prestaciones | `/accounting/reports/benefits-provision` |

### Reportes Tributarios

| Reporte | Ruta |
|---------|------|
| IVA | `/accounting/reports/vat` |
| Retenciones | `/accounting/reports/withholdings` |
| Certificados de Retención | `/accounting/reports/withholding-certificate` |
| Información Exógena | `/accounting/reports/tax-media` |

### Reportes Operacionales

| Reporte | Ruta |
|---------|------|
| Ventas | `/accounting/reports/sales` |
| Compras | `/accounting/reports/purchases` |
| Órdenes de Compra | `/accounting/reports/purchase-order` |
| Recaudo de Caja | `/accounting/reports/cash-receipt` |
| Caja Diaria | `/accounting/reports/daily-cash` |
| Comprobante de Egreso | `/accounting/reports/expense-voucher` |
| Conciliación Bancaria | `/accounting/reports/bank-reconciliation` |

---

## 22. Roles y Permisos

El sistema implementa **RBAC** (Role-Based Access Control). Cada usuario tiene asignado un rol que define:
- Qué módulos puede ver en el sidebar
- Qué acciones puede ejecutar (crear, editar, eliminar)
- Qué datos puede visualizar (segmentados por tenant)

**Regla de visibilidad del sidebar:**
- `SUPER ADMINISTRADOR` y `ADMINISTRADOR` ven todos los módulos
- Los demás roles solo ven los módulos asignados según la configuración en `/settings/team`

**Módulos del sistema (12):**
`dashboard` · `analytics` · `sales` · `inventory` · `crm` · `purchasing` · `documents` · `production` · `payroll` · `accounting` · `logistics` · `settings`

---

## 23. Referencia Técnica

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Base de datos | PostgreSQL via Supabase |
| Autenticación | Supabase Auth |
| Estilos | Tailwind CSS 3.4 + shadcn/ui |
| Estado global | Zustand |
| Validación | Zod |
| AI Engine | Vercel AI SDK + OpenRouter |
| Deployment | Vercel |

### Comandos de Desarrollo

```bash
npm run dev          # Servidor local (auto-detecta puerto 3000-3006)
npm run build        # Build de producción
npm run typecheck    # Verificar tipos TypeScript (objetivo: 0 errores)
npm run lint         # ESLint
npx supabase db push # Aplicar migraciones a Supabase remoto
```

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Arquitectura de Carpetas

```
src/
├── app/(main)/          # Rutas del ERP (159 páginas)
├── app/(auth)/          # Login / Signup
├── features/            # Lógica por módulo (Feature-First)
│   ├── accounting/
│   ├── contracts/
│   ├── notifications/
│   ├── payroll/
│   ├── sales/
│   ├── vendor-portal/
│   └── ...
└── shared/              # Componentes y utilidades reutilizables
    ├── components/layout/ (Sidebar, Header, NotificationBell)
    └── components/ui/     (Button, Badge, Card, etc.)
```

### Migraciones de Base de Datos

| Archivo | Módulo |
|---------|--------|
| `20260303100000_bank_reconciliation.sql` | Conciliación Bancaria |
| `20260303110000_recurring_invoices.sql` | Facturación Recurrente |
| `20260303120000_fixed_assets.sql` | Activos Fijos |
| `20260303130000_fiscal_periods.sql` | Cierre Contable |
| `20260303140000_budgets.sql` | Presupuesto Anual |
| `20260303150000_contracts.sql` | Contratos |

---

*GVM Corp ERP v3 — GVM S.A.S — Colombia 🇨🇴*
