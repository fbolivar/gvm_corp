# Queries SQL para Exportación desde Dolibarr

Este documento contiene las consultas SQL exactas para exportar los datos de Dolibarr en el formato compatible con GVM Corp ERP.

**Base de datos**: MySQL o MariaDB
**Prefijo asumido**: `llx_` (cambiar si el cliente usa otro)
**Formato salida**: CSV con separador coma, encabezados, UTF-8

---

## Comando de ejecución

Cada query debe guardarse como archivo CSV por separado:

```bash
mysql -u USUARIO -p -h HOST BASE_DATOS -B -e "QUERY" \
  | sed 's/\t/,/g;s/"/""/g;s/^/"/;s/$/"/;s/\n//g' > salida.csv
```

O desde phpMyAdmin: Seleccionar query → Exportar → CSV → Descargar

---

## 1. Terceros (Clientes y Proveedores)

**Archivo destino**: `dolibarr_terceros.csv`

```sql
SELECT
  s.rowid AS dolibarr_id,
  CASE
    WHEN s.client = 1 AND s.fournisseur = 0 THEN 'CUSTOMER'
    WHEN s.client = 0 AND s.fournisseur = 1 THEN 'VENDOR'
    WHEN s.client = 1 AND s.fournisseur = 1 THEN 'BOTH'
    ELSE 'OTHER'
  END AS party_role,
  CASE
    WHEN s.typent_id = 8 THEN 'PERSON'
    ELSE 'COMPANY'
  END AS party_type,
  s.nom AS legal_name,
  s.name_alias AS trade_name,
  s.siren AS doc_number,
  s.tva_intra AS nit,
  s.email,
  s.phone,
  s.address,
  s.zip,
  s.town AS city,
  s.state AS department,
  s.code_client,
  s.code_fournisseur,
  (s.client = 1) AS is_customer,
  (s.fournisseur = 1) AS is_vendor,
  s.datec AS created_at
FROM llx_societe s
WHERE s.status = 1
ORDER BY s.nom;
```

---

## 2. Productos y Servicios

**Archivo destino**: `dolibarr_productos.csv`

```sql
SELECT
  p.rowid AS dolibarr_id,
  p.ref AS sku,
  p.label AS name,
  p.description,
  CASE WHEN p.fk_product_type = 0 THEN 'GOOD' ELSE 'SERVICE' END AS type,
  'UNIT' AS uom,
  CASE WHEN p.tosell = 1 THEN 'active' ELSE 'inactive' END AS status,
  p.price AS sale_price,
  p.cost_price AS cost,
  p.tva_tx AS vat_rate,
  p.weight,
  p.barcode,
  p.stock AS stock_qty,
  p.seuil_stock_alerte AS stock_alert,
  p.datec AS created_at
FROM llx_product p
WHERE p.entity IN (1)
ORDER BY p.ref;
```

---

## 3. Stock por Almacén

**Archivo destino**: `dolibarr_inventario.csv`

```sql
SELECT
  p.ref AS sku,
  p.label AS product_name,
  e.ref AS warehouse_code,
  e.label AS warehouse_name,
  ps.reel AS qty,
  p.cost_price AS unit_cost,
  (ps.reel * p.cost_price) AS total_value
FROM llx_product_stock ps
INNER JOIN llx_product p ON p.rowid = ps.fk_product
INNER JOIN llx_entrepot e ON e.rowid = ps.fk_entrepot
WHERE ps.reel > 0
  AND e.statut = 1
ORDER BY e.ref, p.ref;
```

---

## 4. Almacenes

**Archivo destino**: `dolibarr_bodegas.csv`

```sql
SELECT
  rowid AS dolibarr_id,
  ref AS code,
  label AS name,
  description,
  address,
  zip,
  town AS city,
  phone,
  fk_pays AS country_id
FROM llx_entrepot
WHERE statut = 1;
```

---

## 5. Facturas de Cliente con Líneas

**Archivo destino**: `dolibarr_facturas_venta.csv`

```sql
SELECT
  f.rowid AS dolibarr_id,
  f.facnumber AS doc_number,
  f.ref AS reference,
  s.nom AS client_name,
  s.tva_intra AS client_nit,
  f.datef AS issue_date,
  f.date_lim_reglement AS due_date,
  f.total_ht AS subtotal,
  f.total_tva AS taxes,
  f.total_ttc AS total,
  f.paye AS is_paid,
  f.close_code,
  CASE
    WHEN f.paye = 1 THEN 'PAID'
    WHEN f.fk_statut = 0 THEN 'DRAFT'
    WHEN f.fk_statut = 1 THEN 'SENT'
    WHEN f.fk_statut = 2 THEN 'ACCEPTED'
    WHEN f.fk_statut = 3 THEN 'VOIDED'
    ELSE 'UNKNOWN'
  END AS status,
  f.type AS invoice_type,
  f.note_public AS notes
FROM llx_facture f
INNER JOIN llx_societe s ON s.rowid = f.fk_soc
WHERE f.datef >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
ORDER BY f.datef DESC;
```

**Líneas de factura**:

```sql
SELECT
  fd.fk_facture AS doc_dolibarr_id,
  fd.rang AS line_number,
  p.ref AS product_sku,
  fd.description,
  fd.qty,
  fd.subprice AS unit_price,
  fd.tva_tx AS vat_rate,
  fd.remise_percent AS discount_pct,
  fd.total_ht AS subtotal,
  fd.total_tva AS vat_amount,
  fd.total_ttc AS total
FROM llx_facturedet fd
LEFT JOIN llx_product p ON p.rowid = fd.fk_product
INNER JOIN llx_facture f ON f.rowid = fd.fk_facture
WHERE f.datef >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
ORDER BY fd.fk_facture, fd.rang;
```

---

## 6. Facturas de Proveedor con Líneas

**Archivo destino**: `dolibarr_facturas_compra.csv`

```sql
SELECT
  ff.rowid AS dolibarr_id,
  ff.ref AS doc_number,
  ff.ref_supplier AS supplier_ref,
  s.nom AS vendor_name,
  s.tva_intra AS vendor_nit,
  ff.datef AS issue_date,
  ff.date_lim_reglement AS due_date,
  ff.total_ht AS subtotal,
  ff.total_tva AS taxes,
  ff.total_ttc AS total,
  ff.paye AS is_paid,
  CASE
    WHEN ff.paye = 1 THEN 'PAID'
    WHEN ff.fk_statut = 0 THEN 'DRAFT'
    WHEN ff.fk_statut = 1 THEN 'VALIDATED'
    WHEN ff.fk_statut = 2 THEN 'PAID'
    WHEN ff.fk_statut = 3 THEN 'CANCELLED'
  END AS status
FROM llx_facture_fourn ff
INNER JOIN llx_societe s ON s.rowid = ff.fk_soc
WHERE ff.datef >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
ORDER BY ff.datef DESC;
```

---

## 7. Cartera por Cobrar (Pendientes)

**Archivo destino**: `dolibarr_cartera_cobrar.csv`

```sql
SELECT
  f.facnumber AS doc_number,
  s.tva_intra AS party_nit,
  s.nom AS party_name,
  f.datef AS issue_date,
  f.date_lim_reglement AS due_date,
  f.total_ht AS subtotal,
  f.total_tva AS taxes,
  f.total_ttc AS total,
  (f.total_ttc - COALESCE((
    SELECT SUM(p.amount)
    FROM llx_paiement_facture pf
    INNER JOIN llx_paiement p ON p.rowid = pf.fk_paiement
    WHERE pf.fk_facture = f.rowid
  ), 0)) AS balance_pending,
  DATEDIFF(CURDATE(), f.date_lim_reglement) AS days_overdue
FROM llx_facture f
INNER JOIN llx_societe s ON s.rowid = f.fk_soc
WHERE f.paye = 0
  AND f.fk_statut IN (1, 2)
ORDER BY f.date_lim_reglement;
```

---

## 8. Cartera por Pagar (Pendientes)

**Archivo destino**: `dolibarr_cartera_pagar.csv`

```sql
SELECT
  ff.ref AS doc_number,
  s.tva_intra AS vendor_nit,
  s.nom AS vendor_name,
  ff.datef AS issue_date,
  ff.date_lim_reglement AS due_date,
  ff.total_ht AS subtotal,
  ff.total_tva AS taxes,
  ff.total_ttc AS total,
  (ff.total_ttc - COALESCE((
    SELECT SUM(pf.amount)
    FROM llx_paiementfourn_facturefourn pf
    WHERE pf.fk_facturefourn = ff.rowid
  ), 0)) AS balance_pending,
  DATEDIFF(CURDATE(), ff.date_lim_reglement) AS days_overdue
FROM llx_facture_fourn ff
INNER JOIN llx_societe s ON s.rowid = ff.fk_soc
WHERE ff.paye = 0
  AND ff.fk_statut = 1
ORDER BY ff.date_lim_reglement;
```

---

## 9. Movimientos de Stock

**Archivo destino**: `dolibarr_movimientos_stock.csv`

```sql
SELECT
  sm.rowid AS dolibarr_id,
  p.ref AS sku,
  p.label AS product_name,
  e.ref AS warehouse_code,
  sm.value AS qty,
  sm.price AS cost,
  CASE
    WHEN sm.value > 0 THEN 'IN'
    WHEN sm.value < 0 THEN 'OUT'
    ELSE 'TRANSFER'
  END AS movement_type,
  sm.label AS description,
  sm.inventorycode,
  sm.datem AS occurred_at
FROM llx_stock_mouvement sm
INNER JOIN llx_product p ON p.rowid = sm.fk_product
INNER JOIN llx_entrepot e ON e.rowid = sm.fk_entrepot
WHERE sm.datem >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
ORDER BY sm.datem DESC;
```

---

## 10. Plan Contable (si Dolibarr tiene módulo contable activo)

**Archivo destino**: `dolibarr_puc.csv`

```sql
SELECT
  rowid AS dolibarr_id,
  account_number AS code,
  label AS name,
  labelshort AS short_name,
  account_category,
  account_parent AS parent_code,
  active,
  CASE
    WHEN account_number LIKE '1%' OR account_number LIKE '5%' THEN 'DEBIT'
    ELSE 'CREDIT'
  END AS nature
FROM llx_accounting_account
WHERE active = 1
  AND entity = 1
ORDER BY account_number;
```

---

## 11. Asientos Contables

**Archivo destino**: `dolibarr_asientos.csv`

```sql
SELECT
  rowid AS dolibarr_id,
  piece_num AS entry_number,
  doc_date AS entry_date,
  doc_ref AS reference,
  label_operation AS description,
  numero_compte AS account_code,
  label_compte AS account_name,
  debit,
  credit,
  subledger_account AS aux_account,
  subledger_label AS aux_label
FROM llx_accounting_bookkeeping
WHERE doc_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
ORDER BY doc_date, piece_num;
```

---

## 12. Usuarios del Sistema

**Archivo destino**: `dolibarr_usuarios.csv`

```sql
SELECT
  rowid AS dolibarr_id,
  login,
  firstname AS first_name,
  lastname AS last_name,
  CONCAT(firstname, ' ', lastname) AS full_name,
  email,
  admin,
  statut AS is_active,
  datec AS created_at,
  lastlogin,
  job,
  office_phone,
  office_fax
FROM llx_user
WHERE statut = 1
ORDER BY lastname, firstname;
```

---

## Validación post-exportación

Ejecutar estas queries de conteo para validar la integridad:

```sql
-- Resumen de registros
SELECT 'Terceros' AS entidad, COUNT(*) AS total FROM llx_societe WHERE status = 1
UNION ALL
SELECT 'Productos', COUNT(*) FROM llx_product WHERE tosell = 1 OR tobuy = 1
UNION ALL
SELECT 'Facturas cliente', COUNT(*) FROM llx_facture
UNION ALL
SELECT 'Facturas proveedor', COUNT(*) FROM llx_facture_fourn
UNION ALL
SELECT 'Movimientos stock (1 año)', COUNT(*) FROM llx_stock_mouvement
  WHERE datem >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
UNION ALL
SELECT 'Asientos contables (1 año)', COUNT(*) FROM llx_accounting_bookkeeping
  WHERE doc_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
UNION ALL
SELECT 'Usuarios activos', COUNT(*) FROM llx_user WHERE statut = 1;

-- Control de saldos por cobrar
SELECT
  SUM(f.total_ttc - COALESCE(pagos.total_pagado, 0)) AS total_por_cobrar
FROM llx_facture f
LEFT JOIN (
  SELECT pf.fk_facture, SUM(p.amount) AS total_pagado
  FROM llx_paiement_facture pf
  INNER JOIN llx_paiement p ON p.rowid = pf.fk_paiement
  GROUP BY pf.fk_facture
) pagos ON pagos.fk_facture = f.rowid
WHERE f.paye = 0 AND f.fk_statut IN (1, 2);
```

Pedir al administrador que envíe los resultados de estos conteos **junto con** los CSVs para validación cruzada.
