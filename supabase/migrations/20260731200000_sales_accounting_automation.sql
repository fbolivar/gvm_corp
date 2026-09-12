-- ═══════════════════════════════════════════════════════════════════════════
-- Contabilización automática de ventas — Fase B (estructura)
--
-- Base: matriz enviada por el contador Andrés (docs/CONTABILIZACION AUTOMATICA
-- VENTAS GVM.xlsx → docs/contabilizacion-ventas-normalizado.csv, 757 reglas).
-- El asiento de una venta depende de: tarifa de IVA del producto × tipo de
-- documento (factura / nota crédito) × forma de pago (contado / crédito) ×
-- tipo de contribuyente del cliente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Enlace asiento ↔ documento ──────────────────────────────────────────
-- accountingService.createEntry ya intentaba escribir esta columna, pero nunca
-- se creó: el INSERT fallaba SIEMPRE y el error se silenciaba en un catch, así
-- que la contabilización automática llevaba meses sin generar un solo asiento.
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_document_id ON public.journal_entries(document_id);

COMMENT ON COLUMN public.journal_entries.document_id IS
  'Documento comercial que originó el asiento (factura, nota crédito). NULL = asiento manual.';

-- ── 2. Forma de pago del documento ─────────────────────────────────────────
-- La matriz distingue contado/crédito, pero el documento no guardaba la forma
-- de pago (el PDF y el envío DIAN mandaban "Contado" fijo).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_form') THEN
    CREATE TYPE public.payment_form AS ENUM ('CONTADO', 'CREDITO');
  END IF;
END $$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS payment_form public.payment_form;

COMMENT ON COLUMN public.documents.payment_form IS
  'Forma de pago del documento. NULL = se deduce del tercero (payment_term_days = 0 → CONTADO).';

-- ── 3. Catálogo de tipos de contribuyente ──────────────────────────────────
-- Antes solo existía como constante de TypeScript, con valores que NO coinciden
-- con los 13 tipos que usa el contador (p. ej. él separa Gran Contribuyente
-- autorretenedor del que no lo es). legacy_code permite migrar lo que ya está
-- guardado en parties.taxpayer_type.
CREATE TABLE IF NOT EXISTS public.taxpayer_types (
    code         text PRIMARY KEY,
    name         text NOT NULL,
    legacy_code  text,
    sort_order   int  NOT NULL DEFAULT 0,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.taxpayer_types IS
  'Tipos de contribuyente usados por las reglas de contabilización (nomenclatura del contador).';

INSERT INTO public.taxpayer_types (code, name, legacy_code, sort_order) VALUES
  ('ESAL',                'Entidades Sin Animo De Lucro',                          'ENTIDAD_SIN_ANIMO_LUCRO', 10),
  ('GC_AUTORRET',         'Grande Contribuyente Autorretenedor',                   'GRAN_CONTRIBUYENTE',      20),
  ('GC_NO_AUTORRET',      'Grande Contribuyente No Autorretenedor',                NULL,                      30),
  ('PJ',                  'Persona Juridica',                                      'RESPONSABLE_IVA',         40),
  ('PJ_AUTORRET',         'Persona Jurídica Autorretenedor',                       'AUTORETENEDOR',           50),
  ('PN_AUTORRET',         'Persona Natural Autorretenedor',                        NULL,                      60),
  ('PN_NO_RESP_IVA',      'Persona Natural No Responsable del IVA',                'PERSONA_NATURAL_NO_RESPONSABLE', 70),
  ('PN_LEY_1429',         'Persona Natural o Juridica Ley 1429',                   NULL,                      80),
  ('PN_RESP_IVA',         'Persona Natural Responsable del IVA',                   'PERSONA_NATURAL_RESPONSABLE',    90),
  ('PN_RESP_IVA_AGENTE',  'Persona Natural Responsable del IVA Agente retenedor',  NULL,                     100),
  ('RST_PJ',              'Régimen Simple de Tributación Persona Juridica',        'REGIMEN_SIMPLE',         110),
  ('RST_PN',              'Régimen Simple de Tributación Persona Natural',         NULL,                     120),
  ('EXTERIOR',            'Tercero del Exterior',                                  NULL,                     130)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.taxpayer_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS taxpayer_types_read ON public.taxpayer_types;
CREATE POLICY taxpayer_types_read ON public.taxpayer_types
    FOR SELECT USING (auth.role() = 'authenticated');

GRANT SELECT ON public.taxpayer_types TO authenticated, service_role;

-- ── 4. Reglas de contabilización ───────────────────────────────────────────
-- Una fila = una línea del asiento. `concept` dice QUÉ monto va en esa cuenta
-- (la matriz del contador solo trae cuenta y naturaleza); se deduce del código
-- de cuenta al cargar el seed.
CREATE TABLE IF NOT EXISTS public.accounting_rules (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    doc_kind      text NOT NULL CHECK (doc_kind IN ('FV', 'NC')),
    iva_rate      numeric(5,2) NOT NULL,
    payment_form  public.payment_form NOT NULL,
    taxpayer_code text NOT NULL REFERENCES public.taxpayer_types(code),
    account_code  text NOT NULL,
    nature        char(1) NOT NULL CHECK (nature IN ('D', 'C')),
    concept       text NOT NULL CHECK (concept IN (
                      'CARTERA', 'INGRESO', 'IVA',
                      'RETEFUENTE', 'RETEICA', 'RETEIVA',
                      'AUTORRENTA_ANTICIPO', 'AUTORRENTA_PASIVO')),
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature)
);

CREATE INDEX IF NOT EXISTS idx_accounting_rules_lookup
    ON public.accounting_rules (tenant_id, doc_kind, payment_form, taxpayer_code, iva_rate);

COMMENT ON TABLE public.accounting_rules IS
  'Matriz de contabilización de ventas del contador: cada fila es una línea del asiento.';

ALTER TABLE public.accounting_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_rules_tenant ON public.accounting_rules;
CREATE POLICY accounting_rules_tenant ON public.accounting_rules
    FOR ALL
    USING (tenant_id = (SELECT get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_rules TO authenticated, service_role;

-- ── 5. Configuración de retenciones ────────────────────────────────────────
-- src/features/taxes/services/taxEngine.ts ya calculaba "base mínima + tarifa"
-- pero leía una tabla que nunca existió. Las bases son las que confirmó Andrés
-- (2026); las TARIFAS quedan en 0 hasta que él las confirme: con tarifa 0 el
-- asiento cuadra igual y simplemente no genera retención.
CREATE TABLE IF NOT EXISTS public.tax_configurations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tax_type     text NOT NULL CHECK (tax_type IN ('RETEFUENTE', 'RETEICA', 'RETEIVA', 'AUTORRENTA')),
    tax_name     text NOT NULL,
    rate         numeric(7,4) NOT NULL DEFAULT 0,
    min_base     numeric(14,2) NOT NULL DEFAULT 0,
    account_code text,
    city         text,
    year         int NOT NULL,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, tax_type, year, city)
);

COMMENT ON COLUMN public.tax_configurations.rate IS
  'Tarifa en porcentaje (2.5 = 2,5%). ReteICA se guarda ya convertida desde el por mil.';
COMMENT ON COLUMN public.tax_configurations.city IS
  'Solo para RETEICA: la tarifa depende del municipio. NULL = tarifa por defecto.';

-- En Postgres dos NULL no colisionan, así que el UNIQUE de arriba no protege las
-- tarifas sin ciudad (las generales). Este índice parcial evita duplicarlas si la
-- migración se corre dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_configurations_general
    ON public.tax_configurations (tenant_id, tax_type, year)
    WHERE city IS NULL;

ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_configurations_tenant ON public.tax_configurations;
CREATE POLICY tax_configurations_tenant ON public.tax_configurations
    FOR ALL
    USING (tenant_id = (SELECT get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_configurations TO authenticated, service_role;

INSERT INTO public.tax_configurations (tenant_id, tax_type, tax_name, rate, min_base, account_code, year)
SELECT t.id, v.tax_type, v.tax_name, v.rate, v.min_base, v.account_code, 2026
FROM public.tenants t
CROSS JOIN (VALUES
    ('RETEFUENTE',  'Retención en la fuente por ventas', 0::numeric,    524000::numeric,  '13551501'),
    ('RETEICA',     'Retención de ICA por ventas',       0::numeric,   1414000::numeric,  '13551801'),
    ('RETEIVA',     'Retención de IVA por ventas',       0::numeric,         0::numeric,  '13551701'),
    ('AUTORRENTA',  'Autorretención de renta 0,55%',     0.55::numeric,      0::numeric,  '13551511')
) AS v(tax_type, tax_name, rate, min_base, account_code)
WHERE t.name ILIKE 'GVM%'
ON CONFLICT DO NOTHING;
