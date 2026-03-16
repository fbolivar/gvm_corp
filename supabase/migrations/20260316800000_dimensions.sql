CREATE TABLE IF NOT EXISTS dimensions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, code)
);
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON dimensions FOR ALL USING (tenant_id = get_my_tenant_id());
GRANT ALL ON dimensions TO authenticated;

CREATE TABLE IF NOT EXISTS dimension_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    dimension_id UUID NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(dimension_id, code)
);
ALTER TABLE dimension_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON dimension_values FOR ALL USING (tenant_id = get_my_tenant_id());
GRANT ALL ON dimension_values TO authenticated;

ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS dimension1_id UUID REFERENCES dimension_values(id);
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS dimension2_id UUID REFERENCES dimension_values(id);
ALTER TABLE document_lines ADD COLUMN IF NOT EXISTS dimension1_id UUID REFERENCES dimension_values(id);
ALTER TABLE document_lines ADD COLUMN IF NOT EXISTS dimension2_id UUID REFERENCES dimension_values(id);
