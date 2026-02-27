-- Add user_id to employees table so employees can be linked to auth.users
-- This enables the self-service portal (my-payroll) to fetch the employee by user_id

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
