-- ============================================================================
-- KIOSK TERMINALS: Terminales de asistencia QR sin login
-- ============================================================================

CREATE TABLE IF NOT EXISTS kiosk_terminals (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT            NOT NULL,
    token           TEXT            NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    gps_lat         NUMERIC(10,7),
    gps_lng         NUMERIC(10,7),
    last_ping_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

ALTER TABLE kiosk_terminals ENABLE ROW LEVEL SECURITY;

-- Authenticated users: tenant isolation for admin management
CREATE POLICY "kiosk_tenant_isolation" ON kiosk_terminals
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Public read by token (for the kiosk page itself — uses admin client, but policy needed for safety)
CREATE POLICY "kiosk_public_read_by_token" ON kiosk_terminals
    FOR SELECT USING (true);

CREATE INDEX idx_kiosk_terminals_token ON kiosk_terminals(token);
CREATE INDEX idx_kiosk_terminals_tenant ON kiosk_terminals(tenant_id);
