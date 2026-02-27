-- 20260226140000_governance_tenant_isolation.sql
-- MIGRACIÓN: Aislamiento por Tenant de la Matriz de Gobernanza y Habilitación de Escritura

-- 1. Añadir tenant_id a role_permissions para aislamiento real en SaaS
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Poblar tenant_id inicial para no romper la matriz actual (usando el primer tenant disponible)
DO $$
DECLARE
    v_default_tenant_id UUID;
BEGIN
    SELECT id INTO v_default_tenant_id FROM tenants LIMIT 1;
    IF v_default_tenant_id IS NOT NULL THEN
        UPDATE role_permissions SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;
END $$;

-- 3. Refinar restricción de unicidad para permitir diferentes permisos por tenant para el mismo rol
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_module_key_key;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_tenant_role_module_unique UNIQUE (tenant_id, role_id, module_key);

-- 4. Actualizar Políticas de RLS para permitir Gestión Administrativa
DROP POLICY IF EXISTS "Allow read role_permissions" ON role_permissions;
CREATE POLICY "Role permissions tenant isolation" ON role_permissions
FOR ALL TO authenticated
USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
)
WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

-- 5. Asegurar que app_roles y app_modules tengan políticas de escritura para admins (aunque son catálogos globales)
CREATE POLICY "Admins can manage app_roles" ON app_roles 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM user_tenants WHERE user_id = auth.uid() AND role IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR'))
);

CREATE POLICY "Admins can manage app_modules" ON app_modules 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM user_tenants WHERE user_id = auth.uid() AND role IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR'))
);

-- 6. Función RPC para obtener permisos de un tenant específico (mejor que select directo en SaaS)
CREATE OR REPLACE FUNCTION get_tenant_permissions(p_tenant_id UUID)
RETURNS SETOF role_permissions AS $$
BEGIN
    RETURN QUERY SELECT * FROM role_permissions WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
