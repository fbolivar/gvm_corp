# Migración desde Dolibarr a GVM Corp ERP

**Proyecto**: Implementación GVM Corp ERP
**Cliente**: GVM Corporation Global Veterinary Medicine S.A.S
**Sistema origen**: Dolibarr
**Sistema destino**: GVM Corp ERP
**Fecha go-live**: 20 de abril de 2026

---

## Archivos en esta carpeta

| Archivo | Propósito | Destinatario |
|---------|-----------|--------------|
| `README.md` | Este documento — guía maestra | Francisco (tú) |
| `01_EMAIL_ADMIN_DOLIBARR.md` | Email formal listo para enviar | Admin Dolibarr |
| `02_QUERIES_SQL_DOLIBARR.md` | Queries SQL de exportación directa | DBA |
| `03_MAPEO_CAMPOS.md` | Transformaciones Dolibarr → GVM Corp | Equipo técnico |
| `04_GUIA_EXPORTACION_UI.md` | Exportación paso a paso vía UI | Admin Dolibarr |

---

## Paso a paso del proceso (tu hoja de ruta)

### DÍA 1 — HOY (17 abril)

**Tiempo estimado**: 1-2 horas

#### Paso 1.1: Identificar al administrador de Dolibarr
- [ ] Contactar al sponsor del cliente
- [ ] Preguntar: "¿Quién administra actualmente Dolibarr?"
- [ ] Obtener: nombre, email, teléfono
- [ ] Agendar reunión de kickoff (30 min)

#### Paso 1.2: Preparar paquete de documentos
- [ ] Abrir `01_EMAIL_ADMIN_DOLIBARR.md`
- [ ] Copiar el cuerpo del email
- [ ] Adjuntar los archivos:
  - `02_QUERIES_SQL_DOLIBARR.md`
  - `03_MAPEO_CAMPOS.md`
  - `04_GUIA_EXPORTACION_UI.md`

#### Paso 1.3: Enviar solicitud
- [ ] Enviar email al admin Dolibarr
- [ ] Copiar a: sponsor del cliente + tu propio email
- [ ] Confirmar recepción por teléfono/WhatsApp

---

### DÍA 2 — 18 abril

**Tiempo estimado**: Espera activa

#### Paso 2.1: Seguimiento
- [ ] Llamar al admin Dolibarr en la mañana (9 AM)
- [ ] Preguntar: "¿Revisó la solicitud? ¿Tiene dudas?"
- [ ] Ofrecer soporte técnico inmediato
- [ ] Acordar hora de entrega de archivos

#### Paso 2.2: Recepción de archivos
- [ ] Recibir link de Google Drive / ZIP
- [ ] Validar que están los 13 archivos CSV
- [ ] Validar `RESUMEN.txt` con conteos
- [ ] Guardar en carpeta local:
  ```
  gvm_corp/imports/dolibarr_2026-04-18/
  ```

---

### DÍA 3 — 19 abril

**Tiempo estimado**: 6-8 horas

#### Paso 3.1: Validación de datos
- [ ] Abrir cada CSV y verificar:
  - Encabezados correctos
  - Codificación UTF-8
  - Sin caracteres raros
  - Fechas en formato YYYY-MM-DD
  - Números sin separador de miles
- [ ] Ejecutar scripts de validación (ver abajo)

#### Paso 3.2: Carga en ambiente de pruebas
- [ ] Usar el importador: `/settings/import` en GVM Corp ERP
- [ ] Cargar en orden:
  1. Almacenes
  2. Plan de cuentas
  3. Terceros (clientes + proveedores)
  4. Productos
  5. Usuarios
  6. Inventario inicial
  7. Activos fijos
  8. Cartera por cobrar
  9. Cartera por pagar
  10. Facturas históricas (si aplica)

#### Paso 3.3: Validación cruzada
- [ ] Comparar totales:
  - Cantidad de terceros: Dolibarr vs GVM Corp
  - Total cartera por cobrar: debe coincidir
  - Total cartera por pagar: debe coincidir
  - Valor total inventario: debe coincidir
- [ ] Generar reporte de validación

#### Paso 3.4: Ajustes finales
- [ ] Resolver errores de importación
- [ ] Crear asiento de apertura
- [ ] Configurar DIAN (certificado, resolución)
- [ ] Crear usuarios reales

---

### DÍA 4 — 20 abril (GO-LIVE)

**Tiempo estimado**: 8 horas, asistencia presencial/remota

#### Paso 4.1: Corte de Dolibarr (00:00 AM)
- [ ] Solicitar al cliente: **desactivar Dolibarr a las 00:00 AM**
- [ ] Cambio de password de admin Dolibarr (bloquear accesos)
- [ ] Última copia de seguridad de Dolibarr
- [ ] Comunicado interno: "A partir de hoy, sistema nuevo"

#### Paso 4.2: Producción (08:00 AM)
- [ ] Validar que usuarios pueden ingresar
- [ ] Probar primera factura DIAN
- [ ] Probar orden de compra
- [ ] Verificar reportes básicos
- [ ] Generar primer backup del día

#### Paso 4.3: Soporte intensivo (08:00 - 18:00)
- [ ] Disponibilidad completa todo el día
- [ ] Resolución de dudas < 15 min
- [ ] Monitoreo de logs cada hora

---

### SEMANA 2 — 21 al 27 abril

- [ ] Soporte diario 9 AM - 5 PM
- [ ] Capacitaciones por módulo
- [ ] Ajustes menores
- [ ] Preparar acta de cierre

---

## Cosas que SIEMPRE debes preguntar al admin Dolibarr

1. **Versión de Dolibarr instalada**
   - Ruta: `Configuración > Información sistema`
   - Dato esperado: `X.X.X`

2. **Prefijo de tablas**
   - Default: `llx_`
   - A veces: `dolibarr_`, `doli_`, personalizado

3. **¿Cuántas entidades hay?**
   - Si `entity` > 1, hay multi-empresa
   - Necesitamos saber qué entidad exportar

4. **¿Tienen módulo de Contabilidad activo?**
   - Si NO → no hay plan contable ni asientos
   - Si SÍ → preguntar si usan el Plan Contable General francés o colombiano

5. **¿Cuál es la fecha del último cierre contable?**
   - Determina desde cuándo migrar asientos

6. **¿Hay módulos custom?**
   - Campos extra en tablas (atributos extra)
   - Si sí, preguntar cuáles y por qué

7. **¿Usan numeración DIAN?**
   - Si han emitido facturas electrónicas, preguntar resolución
   - Si no, numerar desde cero en GVM Corp

8. **¿Hay adjuntos importantes?**
   - PDFs de facturas, contratos, fotos de productos
   - Decidir si migrar manualmente

9. **¿Qué reportes usan más?**
   - Para replicar en GVM Corp si no están

10. **¿Cuántos usuarios activos?**
    - Para calcular licencia necesaria

---

## Cómo manejar situaciones difíciles

### "No tenemos administrador técnico de Dolibarr"
- Preguntar quién lo instaló
- Verificar si tienen acceso al servidor (MySQL, cPanel, etc.)
- Ofrecer servicio adicional: "Podemos nosotros extraer los datos por un costo extra"

### "Dolibarr está en la nube, no sabemos cómo acceder"
- Pedir credenciales de super-admin
- Típico: Dolicloud, Nubedolibarr, hosting compartido
- Si es cloud: preguntar al proveedor por export masivo

### "Los datos tienen errores, están incompletos"
- Documentar los errores
- Acordar con cliente: limpiar en Dolibarr o limpiar en GVM Corp
- Recomendado: limpiar en GVM Corp después de migrar

### "No tienen respaldo reciente"
- CRÍTICO: obligar a hacer backup ANTES de cualquier acción
- `mysqldump -u user -p database > backup.sql`

### "El admin renunció, nadie sabe la clave"
- Pedir al sponsor credenciales de servidor
- Resetear password directo en BD:
  ```sql
  UPDATE llx_user
  SET pass_crypted = MD5('nueva_clave_temporal')
  WHERE login = 'admin';
  ```

---

## Contactos útiles

- **Francisco Bolivar (tú)**: fbolivarb@gmail.com
- **Soporte Dolibarr oficial**: https://www.dolibarr.org/forum
- **Comunidad Dolibarr LATAM**: grupo Telegram "Dolibarr en Español"

---

## Script importador en GVM Corp

El sistema GVM Corp ya tiene importador:
- **Ruta**: `Configuración > Importación > Dolibarr`
- **Formato aceptado**: CSV (mismos nombres que los archivos exportados)
- **Validación previa**: Sí, muestra errores antes de importar
- **Rollback**: Sí, cada importación se puede revertir en 24 horas

**URL directa**: `/settings/import/dolibarr` (una vez implementado)

---

## Lista final de verificación antes del go-live

- [ ] Todos los CSVs recibidos y validados
- [ ] Importación de pruebas exitosa (sin errores críticos)
- [ ] Saldos cuadran (diferencia < $100)
- [ ] Cartera cuadra (todos los documentos migrados)
- [ ] Inventario físico coincide con el digital
- [ ] Usuarios pueden ingresar al sistema
- [ ] DIAN configurado y probado (factura de prueba aceptada)
- [ ] Backup completo generado
- [ ] Plan de rollback documentado (en caso de emergencia)
- [ ] Cliente firmó acta de inicio de operación
