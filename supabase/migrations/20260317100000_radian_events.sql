CREATE TABLE IF NOT EXISTS radian_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    electronic_document_id UUID NOT NULL REFERENCES electronic_documents(id) ON DELETE CASCADE,
    event_code TEXT NOT NULL,
    event_description TEXT,
    response_code TEXT,
    response_message TEXT,
    xml_content TEXT,
    sent_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','ACCEPTED','REJECTED')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_radian_events_doc ON radian_events(electronic_document_id);
ALTER TABLE radian_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON radian_events FOR ALL USING (tenant_id = get_my_tenant_id());
GRANT ALL ON radian_events TO authenticated;
