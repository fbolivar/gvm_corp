-- PRP-005: Agente Autónomo de Cobro de Cartera - Fase 4 (Portal y Multicanal)

-- 1. Table for payment reports uploaded by debtors
CREATE TABLE IF NOT EXISTS payment_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    document_id UUID REFERENCES documents(id),
    party_id UUID REFERENCES parties(id),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
    evidence_url TEXT, -- URL to the receipt image/pdf
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add multicanal support to agent config
ALTER TABLE collection_agent_config 
ADD COLUMN IF NOT EXISTS whatsapp_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
ADD COLUMN IF NOT EXISTS sms_active BOOLEAN DEFAULT FALSE;

-- 3. Bitácora extendida
ALTER TABLE collection_actions
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ; -- Tracking if debtor opened the link

-- 4. RLS for payment_reports
ALTER TABLE payment_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Debtors can insert (but we need a way to verify identity)
-- For now, allow insert with a valid document_id check
CREATE POLICY "Enable insert for everyone (public portal)" 
ON payment_reports FOR INSERT 
WITH CHECK (true);

-- Policy: Internal users see their tenant's reports
CREATE POLICY "Tenant Isolation Reports" ON payment_reports USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

-- 6. RPC to fetch invoice info publicly (sanitized)
CREATE OR REPLACE FUNCTION get_portal_invoice(doc_id UUID)
RETURNS TABLE (
    id UUID,
    number TEXT,
    total NUMERIC,
    due_date DATE,
    status TEXT,
    party_name TEXT,
    tenant_id UUID,
    tenant_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.number,
        d.total,
        d.due_date,
        d.status,
        p.legal_name,
        d.tenant_id,
        t.name
    FROM documents d
    JOIN parties p ON d.party_id = p.id
    JOIN tenants t ON d.tenant_id = t.id
    WHERE d.id = doc_id;
END;
$$;

-- 7. Storage Bucket for Payment Receipts
-- Comentado para ejecución manual o vía MCP si es necesario
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', true);
