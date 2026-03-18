-- ============================================================================
-- Extend parties table with full commercial/fiscal profile
-- New fields: payment_term_days, credit_limit, economic_activity,
--   property_type, salesperson_id, taxpayer_type, payment_method
-- ============================================================================

-- 1. Add new columns to parties (address/city/department/country may already exist)
ALTER TABLE parties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CO';

-- Commercial terms
ALTER TABLE parties ADD COLUMN IF NOT EXISTS payment_term_days INTEGER DEFAULT 0;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2) DEFAULT 0;

-- Fiscal / regulatory
ALTER TABLE parties ADD COLUMN IF NOT EXISTS economic_activity TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS taxpayer_type TEXT DEFAULT 'REGIMEN_SIMPLE';
ALTER TABLE parties ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'TRANSFERENCIA';

-- Property type (role/nature of the third party)
ALTER TABLE parties ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'CLIENTE';

-- Salesperson association
ALTER TABLE parties ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES profiles(id);

-- Price list (may already exist from previous migration)
ALTER TABLE parties ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES price_lists(id);

-- 2. Add comments for documentation
COMMENT ON COLUMN parties.payment_term_days IS 'Plazo de pago en días (0=contado, 30, 60, 90, etc.)';
COMMENT ON COLUMN parties.credit_limit IS 'Cupo máximo de crédito aprobado en COP';
COMMENT ON COLUMN parties.economic_activity IS 'Código CIIU de actividad económica principal';
COMMENT ON COLUMN parties.taxpayer_type IS 'Tipo de contribuyente DIAN';
COMMENT ON COLUMN parties.payment_method IS 'Forma de pago preferida';
COMMENT ON COLUMN parties.property_type IS 'Naturaleza del tercero: CLIENTE, BANCO, VENDEDOR, EMPLEADO, etc.';
COMMENT ON COLUMN parties.salesperson_id IS 'Vendedor asignado al tercero (referencia a profiles)';
