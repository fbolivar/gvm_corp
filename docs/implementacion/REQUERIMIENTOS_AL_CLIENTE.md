# Requerimientos de Información para Migración

**Proyecto**: Implementación ERP GVM Corp
**Cliente**: GVM Corporation Global Veterinary Medicine S.A.S
**Fecha go-live**: 20 de abril de 2026
**Desarrollador**: BC Fabric SAS

---

## Información requerida

Solicitamos al cliente exportar desde WorldOffice y entregar los siguientes archivos en formato Excel o CSV, siguiendo las plantillas adjuntas.

### 1. Datos maestros

| # | Archivo | Descripción | Prioridad |
|---|---------|-------------|-----------|
| 1 | `01_plan_cuentas_PUC.csv` | Plan de cuentas completo con estructura y auxiliares | CRÍTICO |
| 2 | `02_terceros_clientes_proveedores.csv` | Todos los clientes y proveedores activos | CRÍTICO |
| 3 | `03_productos.csv` | Catálogo completo de productos y servicios | CRÍTICO |
| 4 | `04_empleados.csv` | Plantilla de empleados activos | CRÍTICO |
| 5 | `09_activos_fijos.csv` | Activos fijos con depreciación acumulada | CRÍTICO |

### 2. Saldos iniciales (al 2026-04-19)

| # | Archivo | Descripción | Prioridad |
|---|---------|-------------|-----------|
| 6 | `05_saldos_iniciales.csv` | Balance de prueba a la fecha de corte | CRÍTICO |
| 7 | `06_cartera_por_cobrar.csv` | Facturas pendientes de cobro por cliente | CRÍTICO |
| 8 | `07_cartera_por_pagar.csv` | Facturas pendientes de pago a proveedores | CRÍTICO |
| 9 | `08_inventario_inicial.csv` | Inventario físico por bodega y lote | CRÍTICO |

### 3. Configuración DIAN

- [ ] Certificado digital (.p12 o .pfx) con contraseña
- [ ] Software ID de producción (asignado por DIAN)
- [ ] PIN del software
- [ ] Clave técnica (Technical Key)
- [ ] Resolución de facturación vigente (número, rango, fechas)
- [ ] Resolución de nómina electrónica (si aplica)

### 4. Configuración bancaria

- [ ] Listado de cuentas bancarias con saldos a la fecha de corte
- [ ] Último extracto bancario de cada cuenta
- [ ] Conciliaciones pendientes (si las hay)

### 5. Usuarios y accesos

| # | Archivo | Descripción |
|---|---------|-------------|
| 10 | `10_usuarios_sistema.csv` | Lista de usuarios con rol asignado |

Roles disponibles (28 predefinidos):
- SUPER ADMINISTRADOR (acceso total)
- ADMINISTRADOR
- GENERAL MANAGER
- CONTADOR
- GESTOR DE TESORERIA Y CARTERA
- REPRESENTANTE COMERCIAL
- JEFE DE LOGISTICA
- COORDINADOR DE ALMACEN
- AUXILIAR CONTABLE
- AUXILIAR DE FACTURACION
- *(lista completa en sistema)*

### 6. Documentos históricos (opcional)

Si desean migrar historial:
- Facturas de venta emitidas del último año
- Facturas de compra recibidas del último año
- Asientos contables del último trimestre

---

## Formato de entrega

- **Formato**: CSV (UTF-8) o Excel (.xlsx)
- **Separador**: coma (,)
- **Codificación**: UTF-8 sin BOM
- **Fechas**: YYYY-MM-DD
- **Decimales**: punto (.), sin separador de miles
- **NITs**: sin puntos ni guiones, con dígito de verificación separado

---

## Entregables de BC Fabric SAS

1. **Antes del 18 de abril**:
   - Tenant productivo limpio
   - 10 plantillas CSV para llenar
   - Manual de uso del ERP
   - Credenciales de usuario administrador

2. **20 de abril (Go-live)**:
   - Datos migrados en sistema productivo
   - Usuarios creados y roles asignados
   - DIAN configurado y probado
   - Saldos iniciales cargados

3. **Post go-live (del 20 al 27 de abril)**:
   - Soporte intensivo 8 horas/día
   - Capacitación presencial/remota
   - Ajustes en caliente
   - Acompañamiento en primera facturación DIAN

---

## Cronograma resumen

| Fecha | Actividad |
|-------|-----------|
| **17 abr** | Entrega de plantillas y requerimientos al cliente |
| **18 abr** | Cliente entrega datos llenos |
| **19 abr** | Validación y carga de datos en ambiente de pruebas |
| **20 abr** | **GO-LIVE** — corte de WorldOffice, inicio en GVM Corp ERP |
| **21-27 abr** | Estabilización y soporte intensivo |
| **27 abr** | Entrega oficial del proyecto |

---

## Contacto soporte

**Francisco Bolivar — BC Fabric SAS**
- Email: fbolivarb@gmail.com
- Durante go-live: disponibilidad inmediata

**Firmado por**: _________________________________
**Fecha**: 2026-04-17
