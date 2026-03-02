-- =============================================
-- MÓDULO: Gestión de Activos Fijos
-- Fecha: 2026-03-03
-- Descripción: Registro y depreciación de activos fijos
-- =============================================

CREATE TABLE IF NOT EXISTS fixed_assets (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                     TEXT          NOT NULL,
    code                     TEXT          NOT NULL DEFAULT '',
    category                 TEXT          NOT NULL DEFAULT 'EQUIPMENT'
                                           CHECK (category IN ('LAND','BUILDING','VEHICLE','EQUIPMENT','FURNITURE','COMPUTER','OTHER')),
    acquisition_date         DATE          NOT NULL,
    acquisition_cost         NUMERIC(15,2) NOT NULL,
    salvage_value            NUMERIC(15,2) NOT NULL DEFAULT 0,
    useful_life_years        INT           NOT NULL DEFAULT 5,
    accumulated_depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
    status                   TEXT          NOT NULL DEFAULT 'ACTIVE'
                                           CHECK (status IN ('ACTIVE','DISPOSED','FULLY_DEPRECIATED')),
    location                 TEXT,
    serial_number            TEXT,
    notes                    TEXT,
    chart_account_id         UUID          REFERENCES chart_accounts(id) ON DELETE SET NULL,
    created_by               UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'fixed_assets' AND policyname = 'fixed_assets_tenant'
    ) THEN
        CREATE POLICY "fixed_assets_tenant"
            ON fixed_assets FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant   ON fixed_assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(tenant_id, category);
