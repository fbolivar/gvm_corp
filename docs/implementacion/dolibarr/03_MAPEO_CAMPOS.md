# Mapeo de Campos: Dolibarr → GVM Corp ERP

Este documento define cómo se transforman los campos de Dolibarr hacia las tablas de GVM Corp ERP.

---

## 1. Terceros

| Dolibarr (llx_societe) | GVM Corp (parties) | Transformación |
|------------------------|--------------------|--------------------|
| `rowid` | `party_external_ids.source_id` | Guardar mapeo original |
| `nom` | `legal_name` | Copia directa |
| `name_alias` | `trade_name` | Copia directa |
| `siren` / `idprof1` | `doc_number` | Copia (si es NIT) |
| `tva_intra` | `nit` | Extraer dígitos |
| Auto-calculado | `dv` | Dígito verificación colombiano |
| `email` | `email` | Copia |
| `phone` | `phone` | Normalizar a +57 |
| `client = 1` | `is_customer = true` | Flag |
| `fournisseur = 1` | `is_vendor = true` | Flag |
| `typent_id = 8` (particular) | `party_type = 'PERSON'` | Enum |
| Otros `typent_id` | `party_type = 'COMPANY'` | Enum |
| `address` + `zip` + `town` | (metadata.address) | Concatenar |
| `fk_pays` | (metadata.country) | Lookup país |

**Nota**: Dolibarr no diferencia tipo de documento (CC vs NIT). Asumir NIT para empresas, preguntar al cliente para personas naturales.

---

## 2. Productos

| Dolibarr (llx_product) | GVM Corp (products) | Transformación |
|------------------------|---------------------|---------------------|
| `ref` | `sku` | Copia directa |
| `label` | `name` | Copia directa |
| `description` | (metadata.description) | Copia |
| `fk_product_type = 0` | `type = 'GOOD'` | Enum (0=producto, 1=servicio) |
| `fk_product_type = 1` | `type = 'SERVICE'` | Enum |
| `tosell = 1` | `status = 'active'` | Boolean → enum |
| `tosell = 0` | `status = 'inactive'` | Boolean → enum |
| `tva_tx` | (metadata.tax_rate) | Tasa IVA |
| `price` | `price_lists.unit_price` | Crear en lista "General" |
| `cost_price` | (movements.cost) | Usar en movimientos IN |
| Siempre | `uom = 'UNIT'` | Default (Dolibarr no tiene UOM estándar) |
| `stock_alert` | (metadata.min_stock) | Alerta stock mínimo |

---

## 3. Stock / Inventario

| Dolibarr | GVM Corp | Transformación |
|----------|----------|---------------------|
| `llx_product_stock.reel` | `inventory_movements` (tipo IN) | Generar movimiento inicial |
| `llx_entrepot` | `warehouses` | Mapeo 1:1 |
| `llx_stock_mouvement` | `inventory_movements` | Histórico completo |
| `value > 0` | `type = 'IN'` | Signo positivo |
| `value < 0` | `type = 'OUT'` | Signo negativo |

**Estrategia**: Generar asientos de apertura a fecha de corte con el stock actual, luego cargar movimientos históricos del último año.

---

## 4. Facturas de Venta

| Dolibarr (llx_facture) | GVM Corp (documents) | Transformación |
|------------------------|----------------------|---------------------|
| `facnumber` / `ref` | `number` | Preservar numeración original |
| `fk_soc` | `party_id` | Lookup por NIT |
| `datef` | `issue_date` | YYYY-MM-DD |
| `date_lim_reglement` | `due_date` | YYYY-MM-DD |
| `total_ht` | `subtotal` | Numérico |
| `total_tva` | `taxes` | Numérico |
| `total_ttc` | `total` | Numérico |
| Siempre | `doc_type = 'INVOICE'` | Hard-coded |
| Siempre | `currency = 'COP'` | Default |
| `fk_statut = 0` | `status = 'DRAFT'` | Enum |
| `fk_statut = 1` | `status = 'SENT'` | Enum |
| `fk_statut = 2` + `paye = 1` | `status = 'ACCEPTED'` | Enum |
| `fk_statut = 3` | `status = 'VOIDED'` | Enum |

**Líneas** (`llx_facturedet` → `document_lines`):

| Dolibarr | GVM Corp |
|----------|----------|
| `fk_product` | `product_id` (lookup por SKU) |
| `description` | `description` |
| `qty` | `qty` |
| `subprice` | `unit_price` |
| `total_ht` | `line_total` |
| `tva_tx` | `tax_config.iva` |

---

## 5. Facturas de Compra

| Dolibarr (llx_facture_fourn) | GVM Corp |
|--------------------------------|----------|
| `ref` | `purchase_orders.po_number` |
| `ref_supplier` | (metadata.supplier_ref) |
| `fk_soc` | `supplier_id` |
| `datef` | `order_date` |
| `total_ht` | `subtotal` |
| `total_tva` | `tax_total` |
| `total_ttc` | `total` |
| `fk_statut = 2` | `status = 'RECEIVED'` |

**Nota**: Dolibarr maneja facturas de compra como documentos, GVM Corp las maneja como órdenes de compra recibidas.

---

## 6. Plan Contable

| Dolibarr (llx_accounting_account) | GVM Corp (chart_accounts) |
|-------------------------------------|-----------------------------|
| `account_number` | `code` |
| `label` | `name` |
| `account_parent` | (metadata.parent_code) |
| Derivado del código | `nature` (DEBIT/CREDIT) |
| `active = 1` | (sin enum, se filtra activos) |

**Reglas de nature** (PUC colombiano):
- Códigos 1xxx, 5xxx, 6xxx, 7xxx → `DEBIT`
- Códigos 2xxx, 3xxx, 4xxx → `CREDIT`

---

## 7. Asientos Contables

| Dolibarr (llx_accounting_bookkeeping) | GVM Corp |
|-----------------------------------------|----------|
| `piece_num` | `journal_entries.number` |
| `doc_date` | `journal_entries.entry_date` |
| `label_operation` | `journal_entries.description` |
| `numero_compte` | `journal_lines.account_id` (lookup) |
| `debit` | `journal_lines.debit` |
| `credit` | `journal_lines.credit` |

Agrupar por `piece_num` → un `journal_entry` con múltiples `journal_lines`.

---

## 8. Usuarios

| Dolibarr (llx_user) | GVM Corp |
|----------------------|----------|
| `email` | `auth.users.email` + `profiles.email` |
| `firstname + lastname` | `profiles.full_name` |
| `admin = 1` | `user_tenants.role = 'ADMINISTRADOR'` |
| `job` | (metadata.position) |

**Nota**: Los usuarios deben crearse con contraseña temporal y forzar cambio en primer login.

---

## Casos especiales

### Dolibarr maneja multi-entidad

Si la instalación de Dolibarr tiene múltiples entidades (`entity` column), filtrar solo la entidad activa del cliente. Normalmente `entity = 1`.

### Moneda distinta a COP

Si Dolibarr tiene facturas en USD/EUR, convertir al TRM del día de emisión y guardar el valor original en metadata.

### Numeración con prefijos

Dolibarr suele tener numeración tipo `FA2612-0001`. Preservar el formato original en `documents.number`.

### Tercer consolidado "GENERAL"

A veces Dolibarr tiene un tercer catch-all. Verificar con el cliente si migrar o consolidar.

### IVA diferencial

Dolibarr permite IVA por línea, GVM Corp también. Mapear 1:1 vía `tax_config`.

---

## Tabla de correspondencia de estados

| Estado Dolibarr | Estado GVM Corp |
|-----------------|-----------------|
| `fk_statut = 0` | `DRAFT` |
| `fk_statut = 1` | `SENT` / `VALIDATED` |
| `fk_statut = 2` | `ACCEPTED` / `PAID` |
| `fk_statut = 3` | `VOIDED` / `CANCELLED` |

---

## Datos que NO se migran automáticamente

- Adjuntos y archivos (PDF, imágenes)
- Configuración de módulos de Dolibarr
- Plantillas de email/impresión
- Reglas de descuento complejas
- Módulos custom del cliente

Estos requieren migración manual o recreación en GVM Corp.
