-- ─── Módulo: Órdenes de Compra con Flujo de Aprobación ───────────────────────
-- Fecha: 2026-03-03
-- Descripción: Gestión de órdenes de compra (OC) para distribuidora veterinaria.
--              Incluye flujo DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED,
--              numeración automática OC-YYYY-NNNNN por tenant, y RLS estricto.
-- ─────────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. SECUENCIA DE NUMERACIÓN POR TENANT
-- Una tabla de control de secuencias permite números independientes por tenant
-- (una sola secuencia global no permite saltos por tenant, por eso usamos tabla).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_number_sequences (
    tenant_id  UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year       INTEGER NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, year)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. TABLA PRINCIPAL: purchase_orders
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    po_number           TEXT          NOT NULL,
    supplier_id         UUID          NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    warehouse_id        UUID          REFERENCES warehouses(id) ON DELETE SET NULL,
    status              TEXT          NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN (
                            'DRAFT',
                            'PENDING_APPROVAL',
                            'APPROVED',
                            'PARTIALLY_RECEIVED',
                            'RECEIVED',
                            'CANCELLED'
                        )),
    order_date          DATE          NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery   DATE,
    subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_total           NUMERIC(15,2) NOT NULL DEFAULT 0,
    total               NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    approved_by         UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at         TIMESTAMPTZ,
    created_by          UUID          DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

    -- Número único dentro del tenant
    UNIQUE (tenant_id, po_number)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. TABLA DE LÍNEAS: purchase_order_lines
-- line_total es columna generada: qty × unit_cost (sin impuesto, el IVA se
-- agrega en la cabecera via tax_total para compatibilidad con régimen colombiano)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty          NUMERIC(15,2) NOT NULL CHECK (qty > 0),
    unit_cost    NUMERIC(15,2) NOT NULL CHECK (unit_cost >= 0),
    tax_rate     NUMERIC(5,4)  NOT NULL DEFAULT 0.19,   -- IVA 19% Colombia
    line_total   NUMERIC(15,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
    qty_received NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
    notes        TEXT
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. ÍNDICES
-- ──────────────────────────────────────────────────────────────────────────────

-- purchase_orders
CREATE INDEX IF NOT EXISTS idx_po_tenant_id
    ON purchase_orders(tenant_id);

CREATE INDEX IF NOT EXISTS idx_po_tenant_status
    ON purchase_orders(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_po_supplier_id
    ON purchase_orders(supplier_id);

CREATE INDEX IF NOT EXISTS idx_po_created_at
    ON purchase_orders(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_po_order_date
    ON purchase_orders(tenant_id, order_date DESC);

-- purchase_order_lines
CREATE INDEX IF NOT EXISTS idx_pol_order_id
    ON purchase_order_lines(order_id);

CREATE INDEX IF NOT EXISTS idx_pol_product_id
    ON purchase_order_lines(product_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. FUNCIÓN: generate_po_number(p_tenant_id)
-- Obtiene el siguiente número correlativo para el año en curso, por tenant.
-- Formato: OC-YYYY-NNNNN  (ej: OC-2026-00001)
-- Usa SELECT ... FOR UPDATE en po_number_sequences para evitar race conditions.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_po_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year       INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    v_next_val   INTEGER;
BEGIN
    -- Bloquea la fila del tenant+año y avanza el contador de forma atómica
    INSERT INTO po_number_sequences (tenant_id, year, last_value)
    VALUES (p_tenant_id, v_year, 1)
    ON CONFLICT (tenant_id, year)
    DO UPDATE SET last_value = po_number_sequences.last_value + 1
    RETURNING last_value INTO v_next_val;

    RETURN 'OC-' || v_year::TEXT || '-' || LPAD(v_next_val::TEXT, 5, '0');
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. FUNCIÓN + TRIGGER: auto-asignar po_number en INSERT si viene NULL
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
        NEW.po_number := generate_po_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purchase_orders_set_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_po_number();

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. TRIGGER: actualizar updated_at automáticamente
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Solo crear el trigger si no existe ya una función homónima en otro módulo;
-- si ya existe trg_set_updated_at de otro módulo, el trigger apunta a ella.
CREATE TRIGGER trg_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE po_number_sequences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- po_number_sequences: solo la función SECURITY DEFINER la toca;
-- usuarios normales no deben leer ni escribir directamente.
CREATE POLICY "po_seq_deny_direct"
    ON po_number_sequences
    USING (false);

-- ── purchase_orders ──────────────────────────────────────────────────────────
CREATE POLICY "po_select_tenant"
    ON purchase_orders
    FOR SELECT
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "po_insert_tenant"
    ON purchase_orders
    FOR INSERT
    WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "po_update_tenant"
    ON purchase_orders
    FOR UPDATE
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "po_delete_tenant"
    ON purchase_orders
    FOR DELETE
    USING (tenant_id = get_my_tenant_id() AND status = 'DRAFT');

-- ── purchase_order_lines ─────────────────────────────────────────────────────
-- Las líneas no tienen tenant_id propio; heredan seguridad a través del order_id.
CREATE POLICY "pol_select_tenant"
    ON purchase_order_lines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = purchase_order_lines.order_id
              AND po.tenant_id = get_my_tenant_id()
        )
    );

CREATE POLICY "pol_insert_tenant"
    ON purchase_order_lines
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = purchase_order_lines.order_id
              AND po.tenant_id = get_my_tenant_id()
        )
    );

CREATE POLICY "pol_update_tenant"
    ON purchase_order_lines
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = purchase_order_lines.order_id
              AND po.tenant_id = get_my_tenant_id()
        )
    );

CREATE POLICY "pol_delete_tenant"
    ON purchase_order_lines
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = purchase_order_lines.order_id
              AND po.tenant_id = get_my_tenant_id()
              AND po.status = 'DRAFT'
        )
    );

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. COMENTARIOS DE DOCUMENTACIÓN
-- ──────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE  purchase_orders                  IS 'Órdenes de compra a proveedores con flujo de aprobación';
COMMENT ON COLUMN purchase_orders.po_number        IS 'Número correlativo único por tenant. Formato: OC-YYYY-NNNNN';
COMMENT ON COLUMN purchase_orders.status           IS 'DRAFT|PENDING_APPROVAL|APPROVED|PARTIALLY_RECEIVED|RECEIVED|CANCELLED';
COMMENT ON COLUMN purchase_orders.tax_total        IS 'IVA total de la orden (sum of line_total * tax_rate por línea)';
COMMENT ON COLUMN purchase_orders.total            IS 'subtotal + tax_total';
COMMENT ON TABLE  purchase_order_lines             IS 'Líneas de productos de cada orden de compra';
COMMENT ON COLUMN purchase_order_lines.tax_rate    IS 'Tasa de IVA por línea. Default 0.19 (19% Colombia)';
COMMENT ON COLUMN purchase_order_lines.line_total  IS 'qty * unit_cost — columna generada (sin incluir IVA)';
COMMENT ON COLUMN purchase_order_lines.qty_received IS 'Cantidad ya recibida en bodega. Actualizada al registrar recepciones.';
