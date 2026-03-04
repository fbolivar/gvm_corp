-- =============================================
-- FIX: Reconcile budget tables schema
-- The original migration (20260302100000) created tables with month/amount per row.
-- The service code expects m01-m12 columns + account_name + sort_order.
-- This migration adds the missing columns and migrates existing data.
-- =============================================

-- 1. Add missing columns to budgets
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add missing columns to budget_lines
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m01 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m02 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m03 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m04 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m05 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m06 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m07 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m08 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m09 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m10 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m11 NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS m12 NUMERIC(15,2) NOT NULL DEFAULT 0;

-- 3. Migrate existing data: copy description -> notes where notes is null
UPDATE budgets SET notes = description WHERE notes IS NULL AND description IS NOT NULL;

-- 4. Migrate existing budget_lines data:
--    - Set account_name from category if null
--    - Distribute the annual 'amount' evenly into m01-m12 for rows that have no month
--    - For rows with a specific month, put amount in the right m-column
UPDATE budget_lines
SET account_name = COALESCE(account_name, category || COALESCE(' — ' || subcategory, ''));

-- For lines with a specific month value, put amount into the corresponding m-column
UPDATE budget_lines SET m01 = COALESCE(amount, 0) WHERE month = 1  AND m01 = 0;
UPDATE budget_lines SET m02 = COALESCE(amount, 0) WHERE month = 2  AND m02 = 0;
UPDATE budget_lines SET m03 = COALESCE(amount, 0) WHERE month = 3  AND m03 = 0;
UPDATE budget_lines SET m04 = COALESCE(amount, 0) WHERE month = 4  AND m04 = 0;
UPDATE budget_lines SET m05 = COALESCE(amount, 0) WHERE month = 5  AND m05 = 0;
UPDATE budget_lines SET m06 = COALESCE(amount, 0) WHERE month = 6  AND m06 = 0;
UPDATE budget_lines SET m07 = COALESCE(amount, 0) WHERE month = 7  AND m07 = 0;
UPDATE budget_lines SET m08 = COALESCE(amount, 0) WHERE month = 8  AND m08 = 0;
UPDATE budget_lines SET m09 = COALESCE(amount, 0) WHERE month = 9  AND m09 = 0;
UPDATE budget_lines SET m10 = COALESCE(amount, 0) WHERE month = 10 AND m10 = 0;
UPDATE budget_lines SET m11 = COALESCE(amount, 0) WHERE month = 11 AND m11 = 0;
UPDATE budget_lines SET m12 = COALESCE(amount, 0) WHERE month = 12 AND m12 = 0;

-- For lines with NO month (annual), distribute amount evenly across 12 months
UPDATE budget_lines
SET m01 = ROUND(COALESCE(amount, 0) / 12, 2),
    m02 = ROUND(COALESCE(amount, 0) / 12, 2),
    m03 = ROUND(COALESCE(amount, 0) / 12, 2),
    m04 = ROUND(COALESCE(amount, 0) / 12, 2),
    m05 = ROUND(COALESCE(amount, 0) / 12, 2),
    m06 = ROUND(COALESCE(amount, 0) / 12, 2),
    m07 = ROUND(COALESCE(amount, 0) / 12, 2),
    m08 = ROUND(COALESCE(amount, 0) / 12, 2),
    m09 = ROUND(COALESCE(amount, 0) / 12, 2),
    m10 = ROUND(COALESCE(amount, 0) / 12, 2),
    m11 = ROUND(COALESCE(amount, 0) / 12, 2),
    m12 = ROUND(COALESCE(amount, 0) / 12, 2)
WHERE month IS NULL
  AND m01 = 0 AND m02 = 0 AND m03 = 0 AND m04 = 0
  AND m05 = 0 AND m06 = 0 AND m07 = 0 AND m08 = 0
  AND m09 = 0 AND m10 = 0 AND m11 = 0 AND m12 = 0
  AND COALESCE(amount, 0) > 0;

-- 5. Map old categories to new BUDGET_CATEGORIES keys for existing rows
UPDATE budget_lines SET category = 'INGRESOS'     WHERE category IN ('Ventas Productos', 'Servicios', 'Otros Ingresos') AND line_type = 'INCOME';
UPDATE budget_lines SET category = 'COSTO_VENTAS'  WHERE category = 'Costo de Ventas';
UPDATE budget_lines SET category = 'NOMINA'        WHERE category = 'Nómina y Prestaciones';
UPDATE budget_lines SET category = 'GASTOS_ADMIN'  WHERE category IN ('Arrendamiento', 'Servicios Públicos', 'Tecnología', 'Gastos Generales', 'Impuestos y Aportes');
UPDATE budget_lines SET category = 'GASTOS_VENTAS' WHERE category = 'Marketing';

-- 6. Add index for the new schema
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_cat ON budget_lines(budget_id, category);
