-- MIGRACIÓN: Seguridad y Gobernanza (Roles, Matrix y Zonas)

-- 1. Tablas de Gobernanza
CREATE TABLE IF NOT EXISTS app_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE, -- 'accounting', 'inventory', etc.
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES app_roles(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL, -- Uso la key para facilitar chequeos en frontend
    can_view BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_admin BOOLEAN DEFAULT FALSE,
    UNIQUE(role_id, module_key)
);

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- 2. Actualizar user_tenants para soportar la nueva infraestructura
ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES app_roles(id);
ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);

-- 3. Sembrado de Módulos (Catálogo Base)
INSERT INTO app_modules (key, name, icon) VALUES
('dashboard', 'Dashboard', 'LayoutGrid'),
('accounting', 'Contabilidad', 'Calculator'),
('inventory', 'Inventario', 'Package'),
('logistics', 'Logística', 'Truck'),
('crm', 'CRM & Clientes', 'Users'),
('sales', 'Ventas', 'ShoppingBag'),
('purchasing', 'Compras', 'ShoppingCart'),
('payroll', 'Nómina', 'Banknote'),
('production', 'Producción', 'Factory'),
('treasury', 'Tesorería', 'Wallet'),
('portfolio', 'Cartera', 'History'),
('dian', 'DIAN & Impuestos', 'FileCheck'),
('documents', 'Documentos', 'FileText'),
('analytics', 'Analítica', 'BarChart3'),
('settings', 'Ajustes', 'Settings')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- 4. Sembrado de Roles
INSERT INTO app_roles (name) VALUES
('ASISTENTE ADMINISTRATIVO'),
('ADMINISTRADOR BODEGA'),
('ASISTENTE LOGISTICO'),
('ASISTENTE COMERCIAL'),
('CONDUCTOR'),
('ASISTENTE TECNICO'),
('AUXILIAR DE LOGISTICA'),
('JEFE ADMINISTRATIVO'),
('REPRESENTANTE COMERCIAL'),
('TECHNICAL MANAGER'),
('ANALISTA DE COMPRAS'),
('APRENDIZ SENA'),
('ASISTENTE DE GERENCIA VENTAS'),
('GESTOR LOGISTICO'),
('AUXILIAR DE FACTURACION'),
('AUXILIAR CONTABLE'),
('CONTADOR'),
('COORDINADOR DE ALMACEN'),
('COORDINADORA DE CALIDAD Y GESTION HUMANA'),
('GENERAL MANAGER'),
('GESTOR DE TESORERIA Y CARTERA'),
('JEFE DE BIOSEGURIDAD'),
('JEFE DE LOGISTICA'),
('OPERARIA DE SERVICIOS GENERALES'),
('SALES AND MARKETING MANAGER'),
('REPRESENTANTE TECNICO'),
('ADMINISTRADOR'),
('SUPER ADMINISTRADOR')
ON CONFLICT (name) DO NOTHING;

-- 5. Inicializar Permisos para Admins (Todo abierto por defecto para ellos)
INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
SELECT r.id, m.key, true, true
FROM app_roles r, app_modules m
WHERE r.name IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR')
ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;

-- 6. Mapeo Automático de Usuarios Existentes
UPDATE user_tenants 
SET role_id = (SELECT id FROM app_roles WHERE name = 'ADMINISTRADOR')
WHERE role = 'admin' AND role_id IS NULL;

-- 5. Función de Seguridad para RLS (Row Level Security)
-- Permite verificar si el usuario actual tiene acceso a un módulo
CREATE OR REPLACE FUNCTION check_user_module_access(p_module_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    SELECT rp.can_view INTO v_has_access
    FROM role_permissions rp
    JOIN user_tenants ut ON ut.role_id = rp.role_id
    WHERE ut.user_id = auth.uid()
    AND rp.module_key = p_module_key;
    
    RETURN COALESCE(v_has_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Habilitar RLS en nuevas tablas
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Solo lectura para usuarios autenticados, Admin para configuración)
CREATE POLICY "Allow read app_roles" ON app_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read app_modules" ON app_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

-- Zonas protegidas por tenant
CREATE POLICY "Zones tenant isolation" ON zones FOR ALL TO authenticated USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

-- 7. RPCs Mejorados para Gestión de Equipo
DROP FUNCTION IF EXISTS get_team_members(UUID);
CREATE OR REPLACE FUNCTION get_team_members(p_tenant_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    role_id UUID,
    zone_name TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.id,
        ut.user_id,
        au.email::TEXT,
        (au.raw_user_meta_data->>'full_name')::TEXT as full_name,
        ut.role,
        ut.role_id,
        z.name as zone_name,
        ut.status,
        ut.created_at
    FROM user_tenants ut
    JOIN auth.users au ON au.id = ut.user_id
    LEFT JOIN zones z ON z.id = ut.zone_id
    WHERE ut.tenant_id = p_tenant_id;
END;
$$;

DROP FUNCTION IF EXISTS add_user_to_tenant_by_email(TEXT, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS add_user_to_tenant_by_email(TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION add_user_to_tenant_by_email(
    p_email TEXT,
    p_tenant_id UUID,
    p_role TEXT,
    p_zone_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_member_id UUID;
BEGIN
    -- Buscar usuario por email
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', p_email;
    END IF;

    -- Insertar o actualizar membresía
    INSERT INTO user_tenants (tenant_id, user_id, role, zone_id, status)
    VALUES (p_tenant_id, v_user_id, p_role, p_zone_id, 'active')
    ON CONFLICT (tenant_id, user_id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        zone_id = EXCLUDED.zone_id,
        status = 'active'
    RETURNING id INTO v_member_id;

    RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Gestión Dinámica de Miembros
DROP FUNCTION IF EXISTS update_team_member_role(UUID, TEXT);
CREATE OR REPLACE FUNCTION update_team_member_role(
    p_membership_id UUID,
    p_new_role TEXT
) RETURNS VOID AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Sincronizar role_id si existe en app_roles
    SELECT id INTO v_role_id FROM app_roles WHERE name = p_new_role;

    UPDATE user_tenants 
    SET 
        role = p_new_role,
        role_id = v_role_id
    WHERE id = p_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS remove_team_member(UUID);
CREATE OR REPLACE FUNCTION remove_team_member(
    p_membership_id UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM user_tenants 
    WHERE id = p_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS update_team_member_zone(UUID, UUID);
CREATE OR REPLACE FUNCTION update_team_member_zone(
    p_membership_id UUID,
    p_new_zone_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE user_tenants 
    SET zone_id = p_new_zone_id 
    WHERE id = p_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
