-- =============================================
-- MÓDULO: Cobros / Comprobantes de Pago
-- Fecha: 2026-03-02
-- Descripción: RLS + columnas de revisión en payment_reports
-- =============================================

-- 1. Columnas de revisión
ALTER TABLE payment_reports
    ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- 2. Habilitar RLS
ALTER TABLE payment_reports ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
-- Lectura: solo su tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'payment_reports' AND policyname = 'payment_reports_tenant_select'
    ) THEN
        CREATE POLICY "payment_reports_tenant_select"
            ON payment_reports FOR SELECT
            USING (tenant_id = get_my_tenant_id());
    END IF;
END $$;

-- Actualización: solo su tenant (aprobar/rechazar)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'payment_reports' AND policyname = 'payment_reports_tenant_update'
    ) THEN
        CREATE POLICY "payment_reports_tenant_update"
            ON payment_reports FOR UPDATE
            USING (tenant_id = get_my_tenant_id());
    END IF;
END $$;

-- Inserción pública: el portal del cliente no está autenticado
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'payment_reports' AND policyname = 'payment_reports_public_insert'
    ) THEN
        CREATE POLICY "payment_reports_public_insert"
            ON payment_reports FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- 4. Índice de rendimiento
CREATE INDEX IF NOT EXISTS idx_payment_reports_tenant_status
    ON payment_reports(tenant_id, status, created_at DESC);
