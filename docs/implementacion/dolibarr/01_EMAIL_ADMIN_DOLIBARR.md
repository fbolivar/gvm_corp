# Email para Administrador de Dolibarr

**Destinatario**: Administrador técnico de Dolibarr del cliente
**Asunto**: Solicitud de exportación de datos para migración a GVM Corp ERP

---

## Cuerpo del email

> **Asunto**: Exportación de datos Dolibarr para migración — GVM Corp ERP
>
> Estimado/a administrador/a,
>
> Como parte del proyecto de migración del ERP Dolibarr hacia la nueva plataforma GVM Corp ERP (fecha de corte: **20 de abril de 2026**), necesitamos su apoyo para exportar la información histórica del sistema Dolibarr en formato CSV.
>
> **Acceso requerido**:
> Necesitamos que usted, como administrador de Dolibarr, nos provea lo siguiente:
>
> ### Opción A — Exportación vía interfaz web (recomendada)
> Desde el módulo **Herramientas > Exportar** de Dolibarr, exportar en formato **CSV (separador: coma)** y codificación **UTF-8**, los siguientes datasets predefinidos:
>
> 1. Terceros (clientes y proveedores)
> 2. Contactos / Socios
> 3. Productos y servicios
> 4. Stock por almacén
> 5. Movimientos de stock
> 6. Facturas de clientes con líneas
> 7. Facturas de proveedores con líneas
> 8. Pedidos/Órdenes (clientes y proveedores)
> 9. Plan contable (si está configurado)
> 10. Asientos contables del último año
> 11. Usuarios del sistema
>
> ### Opción B — Exportación directa desde base de datos (avanzada)
> Si prefiere exportar directamente desde MySQL/MariaDB, adjuntamos el archivo `queries_sql_dolibarr.md` con las consultas exactas. El comando es:
>
> ```bash
> mysql -u [usuario] -p [base_datos] < consultas.sql > export.csv
> ```
>
> ### Datos técnicos que necesitamos confirmar
>
> Por favor responda con la siguiente información:
>
> - [ ] Versión de Dolibarr instalada (Configuración > Información sistema)
> - [ ] Motor de base de datos: MySQL o MariaDB + versión
> - [ ] Prefijo de tablas (normalmente `llx_`)
> - [ ] Idioma/moneda configurada
> - [ ] Cantidad aproximada de: terceros, productos, facturas del último año
> - [ ] Fecha del último cierre contable
>
> ### Formato de entrega
>
> - **Formato**: CSV (UTF-8 sin BOM)
> - **Separador**: coma (,)
> - **Fechas**: YYYY-MM-DD
> - **Decimales**: punto (.), sin separador de miles
> - **Canal seguro**: compartir vía Google Drive / OneDrive con acceso restringido
>
> ### Fechas clave
>
> - **Entrega de archivos**: antes del **18 de abril EOD**
> - **Validación por nuestra parte**: 19 de abril
> - **Go-live**: **20 de abril, 08:00 AM**
> - **Congelamiento de Dolibarr**: desde el 19 de abril a las 23:59
>
> ### Acceso de respaldo
>
> En caso de requerir extracción manual adicional, necesitaríamos acceso **de solo lectura (READ-ONLY)** a la base de datos Dolibarr con:
>
> - Host/IP y puerto del servidor MySQL
> - Usuario y contraseña (temporal, solo durante la ventana de migración)
> - Nombre de la base de datos
> - Acceso por VPN si aplica
>
> ### Garantías
>
> - Toda la información será tratada bajo estricta confidencialidad
> - El acceso será eliminado inmediatamente después del go-live
> - Ningún dato será modificado en Dolibarr durante el proceso
> - Se generará una copia de seguridad completa antes de cualquier operación
>
> Quedamos atentos a su respuesta. En caso de dudas, favor contactar directamente.
>
> Cordialmente,
>
> **Francisco Bolivar**
> BC Fabric SAS — Desarrollador Autorizado
> Email: fbolivarb@gmail.com

---

## Lista de verificación antes de enviar

- [ ] Confirmar con el cliente quién es el administrador de Dolibarr
- [ ] Obtener email del administrador
- [ ] Adjuntar los archivos:
  - `02_QUERIES_SQL_DOLIBARR.md`
  - `03_MAPEO_CAMPOS.md`
  - `04_GUIA_EXPORTACION_UI.md`
- [ ] Copia a: sponsor del cliente, jefe de proyecto
- [ ] Agendar reunión de seguimiento (48 horas después)
