-- ============================================================
-- EJECUTAR ESTE SQL EN: supabase.com/dashboard/project/qoivnsnugfblfebrpifq/sql/new
-- O copiar y pegar en el SQL Editor del Dashboard de Supabase
-- ============================================================

-- PASO 1: Sembrar módulos del catálogo base
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

-- PASO 2: Sembrar roles empresariales
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

-- PASO 3: Inicializar permisos ADMIN y SUPER ADMIN (todo abierto)
INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
SELECT r.id, m.key, true, true
FROM app_roles r, app_modules m
WHERE r.name IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR')
ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;

-- PASO 4: Política RLS - permitir que admins gestionen permisos
DROP POLICY IF EXISTS "Allow admin write role_permissions" ON role_permissions;
CREATE POLICY "Allow admin write role_permissions" ON role_permissions
FOR ALL TO authenticated
USING (true)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_tenants 
        WHERE user_id = auth.uid() 
        AND role IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner')
    )
);

-- PASO 5: Función RPC para actualizar permisos con SECURITY DEFINER (bypasea RLS)
CREATE OR REPLACE FUNCTION upsert_role_permission(
    p_role_id UUID,
    p_module_key TEXT,
    p_can_view BOOLEAN
) RETURNS VOID AS $$
BEGIN
    INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
    VALUES (p_role_id, p_module_key, p_can_view, p_can_view)
    ON CONFLICT (role_id, module_key)
    DO UPDATE SET can_view = p_can_view, can_edit = p_can_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 6: Sincronizar fbolivarb@gmail.com como SUPER ADMINISTRADOR
DO $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'fbolivarb@gmail.com';
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'SUPER ADMINISTRADOR';
    
    IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        UPDATE user_tenants 
        SET role = 'SUPER ADMINISTRADOR', role_id = v_role_id, status = 'active'
        WHERE user_id = v_user_id;
        RAISE NOTICE 'Sincronización SUPER ADMIN completada para fbolivarb@gmail.com';
    END IF;
END $$;

-- Verificación final
SELECT 
    (SELECT count(*) FROM app_roles) as total_roles,
    (SELECT count(*) FROM app_modules) as total_modules,
    (SELECT count(*) FROM role_permissions WHERE can_view = true) as active_permissions;
