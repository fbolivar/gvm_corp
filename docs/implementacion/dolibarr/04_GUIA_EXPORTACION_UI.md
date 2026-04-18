# Guía de Exportación desde la Interfaz de Dolibarr

Para el administrador de Dolibarr — paso a paso sin necesidad de acceso a la base de datos.

---

## Requisitos previos

- Acceso con usuario **administrador** a Dolibarr
- Módulo **Exportaciones** activado:
  - `Configuración > Módulos > Interfaces con sistemas externos > Exportaciones` → Activar
- Navegador Chrome, Firefox o Edge actualizado

---

## Procedimiento general

En Dolibarr, la ruta de exportación es:

**`Herramientas (Outils) > Exportaciones`**

Dolibarr provee **datasets predefinidos** para exportar. El flujo es:

1. Seleccionar dataset (ej: "Lista de terceros")
2. Seleccionar los campos a exportar
3. Aplicar filtros (opcional)
4. Elegir formato **CSV**
5. Descargar

---

## Datasets a exportar

### 1. Terceros (Sociétés)

**Menú**: `Exportaciones > Terceros > Lista de terceros y atributos`

**Campos a seleccionar** (todos si es posible):

```
✓ ID (s.rowid)
✓ Nombre (s.nom)
✓ Nombre comercial (s.name_alias)
✓ ID profesional 1 / SIRET (s.siren)
✓ NIT / TVA intracomunitaria (s.tva_intra)
✓ Email (s.email)
✓ Teléfono (s.phone)
✓ Dirección (s.address)
✓ CP / Código postal (s.zip)
✓ Ciudad (s.town)
✓ Estado/Departamento (s.state)
✓ País (s.fk_pays)
✓ Código cliente (s.code_client)
✓ Código proveedor (s.code_fournisseur)
✓ Es cliente (s.client)
✓ Es proveedor (s.fournisseur)
✓ Tipo entidad (s.typent_id)
✓ Fecha creación (s.datec)
✓ Estado (s.status)
```

**Filtros**: `s.status = 1` (solo activos)

**Nombre archivo salida**: `01_terceros.csv`

---

### 2. Contactos

**Menú**: `Exportaciones > Contactos > Lista de contactos`

**Campos**:
```
✓ ID, Nombre, Apellidos, Email, Teléfono, Cargo
✓ ID Tercero asociado
✓ Dirección, Ciudad, Estado
✓ Estado activo
```

**Salida**: `02_contactos.csv`

---

### 3. Productos y Servicios

**Menú**: `Exportaciones > Productos y servicios > Productos y servicios`

**Campos**:
```
✓ ID, Referencia (SKU), Etiqueta, Descripción
✓ Tipo (0=producto, 1=servicio)
✓ Precio venta HT, Precio venta TTC
✓ Precio coste, IVA (%)
✓ Peso, Código barras
✓ Stock total
✓ Umbral alerta stock, Nivel stock deseado
✓ Activo para venta, Activo para compra
✓ Fecha creación
```

**Salida**: `03_productos.csv`

---

### 4. Almacenes

**Menú**: `Exportaciones > Stock > Lista de almacenes`

**Campos**:
```
✓ ID, Referencia, Etiqueta
✓ Dirección, Ciudad
✓ Estado
```

**Salida**: `04_almacenes.csv`

---

### 5. Stock por Almacén

**Menú**: `Exportaciones > Stock > Stock por producto y almacén`

**Campos**:
```
✓ Producto (referencia + etiqueta)
✓ Almacén (referencia + etiqueta)
✓ Cantidad real
✓ Precio medio ponderado
```

**Filtros**: Stock > 0

**Salida**: `05_stock.csv`

---

### 6. Movimientos de Stock

**Menú**: `Exportaciones > Stock > Movimientos de stock`

**Campos**:
```
✓ ID, Fecha, Producto, Almacén
✓ Cantidad (+ o -)
✓ Precio unitario, Etiqueta
✓ Usuario, Tipo movimiento
```

**Filtros**: Fecha >= hace 1 año

**Salida**: `06_movimientos_stock.csv`

---

### 7. Facturas de Cliente

**Menú**: `Exportaciones > Facturas clientes > Facturas, líneas y pagos`

**Campos** (marcar TODOS):
```
✓ Factura (número, fecha, total HT, total IVA, total TTC)
✓ Tercero (nombre, NIT)
✓ Líneas (producto, cantidad, precio unitario, IVA)
✓ Pagos (monto, fecha, medio)
✓ Estado
```

**Filtros**: Fecha factura >= hace 2 años

**Salida**: `07_facturas_venta.csv`

---

### 8. Facturas de Proveedor

**Menú**: `Exportaciones > Facturas proveedor > Facturas, líneas y pagos`

Similar al anterior pero para compras.

**Salida**: `08_facturas_compra.csv`

---

### 9. Pedidos de Cliente

**Menú**: `Exportaciones > Pedidos cliente > Pedidos y líneas`

**Salida**: `09_pedidos_cliente.csv`

---

### 10. Órdenes de Compra

**Menú**: `Exportaciones > Pedidos proveedor > Pedidos y líneas`

**Salida**: `10_ordenes_compra.csv`

---

### 11. Plan Contable (OMITIR para GVM — usa WorldOffice para contabilidad)

> ❌ **Skip este paso**: El cliente GVM no usa el módulo de Contabilidad de Dolibarr. El PUC se migra desde WorldOffice, no desde Dolibarr.

Solo aplica si el cliente usa contabilidad en Dolibarr:

**Menú**: `Contabilidad > Configuración > Cuentas contables > Lista`

- Buscar botón **Exportar CSV** en la parte inferior
- Filtrar por estado activo

**Salida**: `11_plan_contable.csv`

---

### 12. Asientos Contables

**Menú**: `Contabilidad > Asientos > Consulta`

- Seleccionar rango: último año fiscal
- Click en icono **descargar** (Excel/CSV)

**Salida**: `12_asientos_contables.csv`

---

### 13. Usuarios

**Menú**: `Configuración > Usuarios y grupos > Lista`

- Click botón **Exportar CSV**

**Salida**: `13_usuarios.csv`

---

## Configuración del formato de exportación

En cada pantalla de exportación, antes de descargar:

1. **Formato**: Seleccionar **CSV** (no Excel directo)
2. **Codificación**: UTF-8
3. **Separador**: Punto y coma `;` o coma `,` (preferible coma)
4. **Encerrar texto**: Comillas dobles `"`
5. **Incluir encabezados**: ✓ Sí

---

## Validación de archivos exportados

Después de cada exportación:

1. **Abrir el CSV en un editor de texto** (Notepad++, VSCode)
2. Verificar que:
   - Tiene encabezados en la primera línea
   - Los acentos y eñes se ven bien (UTF-8)
   - No hay caracteres raros tipo `â€¦`
   - El número de filas coincide con lo esperado

3. **Contar filas**: número de filas - 1 (encabezado) = cantidad de registros

---

## Consolidación y entrega

1. Crear una carpeta `Migracion_Dolibarr_GVM_2026-04-18/`
2. Colocar los 13 archivos CSV dentro
3. Incluir un archivo `RESUMEN.txt` con:
   ```
   Fecha exportación: 2026-04-18
   Versión Dolibarr: X.X.X
   Prefijo tablas: llx_
   Total terceros exportados: NNN
   Total productos exportados: NNN
   Total facturas venta: NNN
   Total facturas compra: NNN
   Total asientos contables: NNN
   Usuarios activos: NNN
   ```
4. Comprimir la carpeta como ZIP
5. Subir al canal compartido (Google Drive / OneDrive)
6. Enviar link a: **fbolivarb@gmail.com**

---

## En caso de problemas

### El botón "Exportar" no aparece
- Verificar que el módulo **Exportaciones** esté activo: `Configuración > Módulos > Otros`
- Verificar que el usuario tenga permisos de exportación: `Configuración > Usuarios > Permisos`

### Los acentos se ven mal
- Cambiar codificación a UTF-8 en la configuración de exportación
- Si no, abrir el CSV en Excel con `Datos > Importar desde texto` y especificar UTF-8

### Archivos muy grandes (>100MB)
- Dividir por rango de fechas (ej: año por año)
- Comprimir como ZIP antes de subir

### Faltan campos en el export
- Algunos campos requieren activar módulos: Contabilidad, Stock avanzado, etc.
- Si no están disponibles vía UI, usar las **queries SQL** del documento `02_QUERIES_SQL_DOLIBARR.md`
