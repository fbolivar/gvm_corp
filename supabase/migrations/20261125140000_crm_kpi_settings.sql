
-- Umbrales configurables de los KPIs de visitas/clientes (una fila por tenant).
-- Los define gerencia (is_crm_manager); el resto solo lee.
CREATE TABLE IF NOT EXISTS public.crm_kpi_settings (
    tenant_id             uuid PRIMARY KEY,
    visit_green_pct       int NOT NULL DEFAULT 90,   -- % cumplimiento (realizadas/planeadas) para semáforo verde
    visit_amber_pct       int NOT NULL DEFAULT 70,   -- …para amarillo (menos = rojo)
    client_passive_days   int NOT NULL DEFAULT 45,   -- días sin compra → "pasivo"
    client_inactive_days  int NOT NULL DEFAULT 90,   -- días sin compra → "inactivo"
    growth_pct            int NOT NULL DEFAULT 15,    -- +% (30d vs 30d) → "en crecimiento"
    drop_pct              int NOT NULL DEFAULT 30,    -- -% (magnitud) → "en caída"
    updated_by            uuid,
    updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_kpi_settings ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario del tenant. Escritura: solo gerencia del CRM.
CREATE POLICY kpi_settings_read ON public.crm_kpi_settings
    FOR SELECT TO authenticated
    USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY kpi_settings_write ON public.crm_kpi_settings
    FOR ALL TO authenticated
    USING (tenant_id = public.get_my_tenant_id() AND public.is_crm_manager())
    WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_crm_manager());
