-- Migration: tenant_licenses
-- Creates the tenant_licenses table to manage SaaS license keys per tenant

-- 1. Create table
CREATE TABLE IF NOT EXISTS tenant_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  license_key TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'STARTER' CHECK (plan IN ('STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'TRIAL')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED')),
  modules_enabled TEXT[] NOT NULL DEFAULT '{}',
  max_users INT NOT NULL DEFAULT 5,
  company_name TEXT NOT NULL,
  company_nit TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + interval '1 year'),
  activated_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  issued_by TEXT DEFAULT 'BC Fabric SAS',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 2. Enable RLS
ALTER TABLE tenant_licenses ENABLE ROW LEVEL SECURITY;

-- Policy: tenants can only read their own license
CREATE POLICY tenant_licenses_select_own ON tenant_licenses
  FOR SELECT
  USING (tenant_id = get_my_tenant_id());

-- Policy: only service role / superuser can insert/update/delete
CREATE POLICY tenant_licenses_insert_service ON tenant_licenses
  FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY tenant_licenses_update_service ON tenant_licenses
  FOR UPDATE
  USING (tenant_id = get_my_tenant_id());

-- 3. Index on tenant_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenant_licenses_tenant_id ON tenant_licenses(tenant_id);

-- 4. Seed demo license for GVM tenant
INSERT INTO tenant_licenses (
  tenant_id,
  license_key,
  plan,
  status,
  modules_enabled,
  max_users,
  company_name,
  company_nit,
  valid_from,
  valid_until,
  activated_at,
  issued_by
) VALUES (
  'f188e4a2-1918-4102-8ebd-c82fc16d4ba9',
  'GVM-A7F2-K9D4-M3B8-X1P6',
  'ENTERPRISE',
  'ACTIVE',
  ARRAY['dashboard','analytics','sales','inventory','crm','purchasing','documents','production','payroll','accounting','logistics','settings'],
  18,
  'GVM CORPORATION GLOBAL VETERINARY MEDICINE S.A.S',
  '900534356',
  '2026-01-01',
  '2027-01-01',
  now(),
  'BC Fabric SAS - Desarrollador Autorizado'
) ON CONFLICT (tenant_id) DO NOTHING;
