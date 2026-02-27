-- FIX: Ensure all required columns exist in public.documents
-- and fix the public portal RPC function.

-- 1. Add missing columns to documents if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='due_date') THEN
        ALTER TABLE public.documents ADD COLUMN due_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='balance') THEN
        ALTER TABLE public.documents ADD COLUMN balance NUMERIC DEFAULT 0;
        -- Initialize balance to total for existing documents
        UPDATE public.documents SET balance = total WHERE balance = 0;
    END IF;
END $$;

-- 2. Fixed get_portal_invoice with explicit casting and quoted column names
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
        d."number"::TEXT,
        d.total::NUMERIC,
        d.due_date::DATE,
        d.status::TEXT,
        p.legal_name::TEXT,
        d.tenant_id,
        t.name::TEXT
    FROM public.documents d
    JOIN public.parties p ON d.party_id = p.id
    JOIN public.tenants t ON d.tenant_id = t.id
    WHERE d.id = doc_id;
END;
$$;

-- 3. Ensure payment_reports table and RLS are correct
CREATE TABLE IF NOT EXISTS public.payment_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id),
    document_id UUID REFERENCES public.documents(id),
    party_id UUID REFERENCES public.parties(id),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING',
    evidence_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset RLS for safety
ALTER TABLE public.payment_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for everyone (public portal)" ON public.payment_reports;
CREATE POLICY "Enable insert for everyone (public portal)" 
ON public.payment_reports FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Tenant Isolation Reports" ON public.payment_reports;
CREATE POLICY "Tenant Isolation Reports" ON public.payment_reports USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);
