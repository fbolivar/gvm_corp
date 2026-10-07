-- PRP-008 Fase 3: período mensual de forecast + líneas que ajusta cada comercial.

CREATE TABLE IF NOT EXISTS forecast_periods (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year        int NOT NULL,
    month       int NOT NULL CHECK (month BETWEEN 1 AND 12),
    status      text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
    opened_by   uuid REFERENCES profiles(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, year, month)
);

CREATE TABLE IF NOT EXISTS forecast_lines (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id         uuid NOT NULL REFERENCES forecast_periods(id) ON DELETE CASCADE,
    salesperson_id    uuid REFERENCES profiles(id),
    salesperson_label text NOT NULL,
    sku               text NOT NULL,
    product_label     text NOT NULL,
    product_id        uuid REFERENCES products(id),
    abc_class         text CHECK (abc_class IN ('A','B','C')),
    suggested_qty     numeric NOT NULL DEFAULT 0,
    forecast_qty      numeric,
    is_one_off        boolean NOT NULL DEFAULT false,
    note              text,
    submitted_at      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (period_id, salesperson_label, sku)
);
CREATE INDEX IF NOT EXISTS idx_forecast_lines_period_sp ON forecast_lines (period_id, salesperson_id);

ALTER TABLE forecast_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fp_select" ON forecast_periods FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "fp_mgr_write" ON forecast_periods FOR ALL
    USING (tenant_id = get_my_tenant_id() AND is_purchasing_manager())
    WITH CHECK (tenant_id = get_my_tenant_id() AND is_purchasing_manager());

CREATE POLICY "fl_select" ON forecast_lines FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND (is_purchasing_manager() OR salesperson_id = auth.uid())
);
CREATE POLICY "fl_mgr_write" ON forecast_lines FOR ALL
    USING (tenant_id = get_my_tenant_id() AND is_purchasing_manager())
    WITH CHECK (tenant_id = get_my_tenant_id() AND is_purchasing_manager());

-- El comercial no escribe directo: usa submit_forecast_line (solo forecast_qty/is_one_off/note).
CREATE OR REPLACE FUNCTION submit_forecast_line(
    p_line uuid, p_qty numeric, p_one_off boolean, p_note text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_line forecast_lines%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_qty IS NOT NULL AND (p_qty < 0 OR p_qty > 1e9) THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO v_line FROM forecast_lines WHERE id = p_line AND tenant_id = get_my_tenant_id() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Línea no encontrada'; END IF;
    IF v_line.salesperson_id IS DISTINCT FROM v_uid AND NOT is_purchasing_manager() THEN
        RAISE EXCEPTION 'No es tu línea de pronóstico';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM forecast_periods p WHERE p.id = v_line.period_id AND p.status = 'OPEN') THEN
        RAISE EXCEPTION 'El período de pronóstico está cerrado';
    END IF;
    UPDATE forecast_lines
    SET forecast_qty = p_qty, is_one_off = COALESCE(p_one_off, false),
        note = NULLIF(left(trim(coalesce(p_note, '')), 500), ''), submitted_at = now()
    WHERE id = p_line;
END;
$$;
REVOKE EXECUTE ON FUNCTION submit_forecast_line(uuid, numeric, boolean, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION submit_forecast_line(uuid, numeric, boolean, text) TO authenticated;
