# Checklist de Implementación ERP — GVM Corp

**Cliente**: GVM Corporation Global Veterinary Medicine S.A.S
**Go-live**: 2026-04-20
**Responsable**: BC Fabric SAS

---

## Fase 1 — Preparación (17 abril, HOY)

### Técnico
- [x] Sistema de licencias implementado con certificado PDF
- [x] Backups automáticos semanales activos
- [x] CSP endurecido, CSRF/XSS protection
- [x] Datos demo identificados
- [ ] Aplicar migración de limpieza de datos demo
- [ ] Verificar tenant limpio en Supabase
- [ ] Verificar deploy en producción funcionando

### Comercial
- [ ] Enviar plantillas CSV al cliente
- [ ] Enviar documento `REQUERIMIENTOS_AL_CLIENTE.md`
- [ ] Coordinar reunión de kickoff con equipo del cliente
- [ ] Definir usuarios responsables por módulo
- [ ] Acordar ventana de corte WorldOffice → GVM Corp

---

## Fase 2 — Recepción de datos (18 abril)

### Validación
- [ ] Recibir archivos llenos del cliente
- [ ] Validar formato CSV (UTF-8, sin BOM, comas)
- [ ] Validar integridad referencial:
  - [ ] NITs de terceros únicos
  - [ ] SKUs de productos únicos
  - [ ] Códigos de cuenta existen en PUC
  - [ ] Documentos de cartera referencian clientes válidos
- [ ] Validar saldos cuadran (débitos = créditos)
- [ ] Validar totales de cartera vs saldos contables

### DIAN
- [ ] Recibir certificado digital .p12
- [ ] Recibir Software ID, PIN, clave técnica
- [ ] Recibir resolución de numeración vigente

---

## Fase 3 — Carga en ambiente de pruebas (19 abril)

### Importación en orden de dependencias
1. [ ] Plan de cuentas (PUC)
2. [ ] Terceros (clientes + proveedores)
3. [ ] Productos y servicios
4. [ ] Empleados
5. [ ] Bodegas y ubicaciones
6. [ ] Saldos iniciales → asiento de apertura
7. [ ] Cartera por cobrar (documentos pendientes)
8. [ ] Cartera por pagar (documentos pendientes)
9. [ ] Inventario inicial por bodega/lote
10. [ ] Activos fijos con depreciación acumulada

### Configuración
- [ ] Cargar certificado DIAN en `dian_config`
- [ ] Crear resolución activa en `dian_resolutions`
- [ ] Crear cuentas bancarias en tesorería
- [ ] Configurar período fiscal 2026
- [ ] Activar módulos según licencia

### Usuarios
- [ ] Crear cuentas de usuario en auth.users
- [ ] Asignar tenant y rol en user_tenants
- [ ] Enviar credenciales temporales
- [ ] Forzar cambio de contraseña en primer login

### Validación
- [ ] Emitir factura de prueba → verificar CUFE DIAN
- [ ] Generar reporte de balance → validar cuadre
- [ ] Ejecutar liquidación de nómina prueba
- [ ] Verificar aging de cartera
- [ ] Probar backup y restauración

---

## Fase 4 — Go-Live (20 abril)

### Corte (hora 00:00)
- [ ] Último corte en WorldOffice (cierre de día 19)
- [ ] Notificar a todos los usuarios: "desde hoy solo GVM Corp ERP"
- [ ] Comunicar credenciales finales de acceso
- [ ] Activar backup antes del corte

### Arranque (hora 08:00)
- [ ] Primera factura emitida en producción
- [ ] Primer recibo de caja
- [ ] Primera orden de compra
- [ ] Primer asiento manual
- [ ] Validar sincronización DIAN

### Monitoreo primer día
- [ ] Logs de errores revisados cada 2 horas
- [ ] Tiempos de respuesta < 3s
- [ ] Usuarios pueden acceder sin problemas
- [ ] DIAN acepta facturas emitidas
- [ ] Backup automático del día ejecutado

---

## Fase 5 — Estabilización (21-27 abril)

### Soporte diario
- [ ] Revisión matutina de logs (9 AM)
- [ ] Canal de WhatsApp/Slack disponible
- [ ] Resolución de tickets < 4 horas
- [ ] Actualización del manual con casos reales

### Capacitación
- [ ] Sesión 1: Ventas y facturación (2h)
- [ ] Sesión 2: Compras y tesorería (2h)
- [ ] Sesión 3: Nómina y RRHH (2h)
- [ ] Sesión 4: Contabilidad y reportes (2h)
- [ ] Sesión 5: Reportes gerenciales y BI (1h)

### Ajustes
- [ ] Personalizar plantillas de impresión con logo del cliente
- [ ] Configurar centros de costo específicos
- [ ] Ajustar aprobaciones de OC según monto
- [ ] Activar notificaciones automáticas

---

## Fase 6 — Cierre del proyecto (27 abril)

- [ ] Reunión de cierre con sponsor
- [ ] Firma de acta de recibo a conformidad
- [ ] Entrega de:
  - [ ] Certificado de licencia PDF firmado
  - [ ] Credenciales de administrador
  - [ ] Manual del sistema
  - [ ] Documentación técnica
- [ ] Plan de soporte mensual
- [ ] Agenda de renovación de licencia (2027-01-01)

---

## Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Cliente no entrega datos a tiempo | Media | Plan B: go-live parcial solo con datos maestros |
| Certificado DIAN tiene problemas | Baja | Pruebas previas en ambiente TEST |
| Usuarios no adoptan el sistema | Media | Capacitación presencial + soporte intensivo |
| Performance con datos masivos | Baja | Ya probado con 1000+ registros, Supabase escala |
| Caída de internet | Baja | PWA funciona offline para consultas |
| Error en cuadre de saldos | Alta | Validación previa + asientos de ajuste |

---

## Contactos clave

### Cliente
- **Sponsor**: _________________________
- **Líder técnico**: _________________________
- **Contador**: _________________________

### BC Fabric SAS
- **Francisco Bolivar** — fbolivarb@gmail.com

---

**Estado del proyecto**: ✅ Aprobado, en implementación
**Última actualización**: 2026-04-17
