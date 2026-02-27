-- ============================================================
-- MIGRACIÓN: Gobernanza Completa V3 (2026-02-27 05:00)
-- Objetivos:
--   1. Sembrar los 28 roles reales del negocio
--   2. Sembrar los 12 módulos del sistema (exactos al sidebar)
--   3. Función get_my_tenant_id() SECURITY DEFINER (evita ciclos RLS)
--   4. Smart RLS: aislamiento por tenant sin romper la app
--   5. Matriz de permisos por rol (defaults sensatos)
--   6. Fix update_team_member_role: sincronizar role_id
-- ============================================================

-- ============================================================
-- FASE 1: Roles completos
-- ============================================================
INSERT INTO app_roles (name, description) VALUES
('SUPER ADMINISTRADOR',      'Acceso total al sistema. Sin restricciones.'),
('ADMINISTRADOR',            'Gestión completa de la organización.'),
('GENERAL MANAGER',          'Gerente General. Visibilidad completa ejecutiva.'),
('SALES AND MARKETING MANAGER', 'Gerente de Ventas y Marketing.'),
('TECHNICAL MANAGER',        'Gerente Técnico. Producción e inventario.'),
('JEFE ADMINISTRATIVO',      'Jefe de área administrativa. Finanzas, RRHH.'),
('JEFE DE LOGISTICA',        'Jefe de Logística. Operaciones de cadena de suministro.'),
('JEFE DE BIOSEGURIDAD',     'Jefe de Bioseguridad. Control de producción y calidad.'),
('COORDINADOR DE ALMACEN',   'Coordinador de Almacén. Inventario y bodegas.'),
('COORDINADORA DE CALIDAD Y GESTION HUMANA', 'Calidad, RRHH y gestión del talento.'),
('CONTADOR',                 'Contador. Contabilidad y estados financieros.'),
('GESTOR DE TESORERIA Y CARTERA', 'Tesorería, cartera y flujo de caja.'),
('ANALISTA DE COMPRAS',      'Compras y gestión de proveedores.'),
('REPRESENTANTE COMERCIAL',  'Representante de ventas. CRM, cotizaciones.'),
('ASISTENTE DE GERENCIA VENTAS', 'Asistente gerencia de ventas.'),
('GESTOR LOGISTICO',         'Gestor de logística y despachos.'),
('ASISTENTE ADMINISTRATIVO', 'Asistente administrativo general.'),
('ASISTENTE LOGISTICO',      'Apoyo en operaciones logísticas.'),
('ASISTENTE COMERCIAL',      'Apoyo en ventas y atención al cliente.'),
('AUXILIAR CONTABLE',        'Auxiliar de contabilidad. Registros y conciliaciones.'),
('AUXILIAR DE FACTURACION',  'Facturación y documentos electrónicos.'),
('AUXILIAR DE LOGISTICA',    'Apoyo operativo en logística.'),
('ADMINISTRADOR BODEGA',     'Administración de bodega e inventario físico.'),
('REPRESENTANTE TECNICO',    'Soporte técnico y visitas de campo.'),
('CONDUCTOR',                'Conductor. Logística y entregas.'),
('ASISTENTE TECNICO',        'Asistente técnico de campo.'),
('OPERARIA DE SERVICIOS GENERALES', 'Servicios generales y mantenimiento.'),
('APRENDIZ SENA',            'Aprendiz SENA. Acceso básico de lectura.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- ============================================================
-- FASE 2: Módulos completos (deben coincidir con sidebar moduleKey)
-- ============================================================
INSERT INTO app_modules (key, name, icon, description) VALUES
('dashboard',   'Dashboard',         'LayoutDashboard',  'Panel principal con KPIs'),
('analytics',   'Analítica',         'BarChart3',        'Reportes ejecutivos y gráficas'),
('sales',       'Ventas',            'ShoppingCart',     'Cotizaciones, órdenes y facturas de venta'),
('inventory',   'Inventario',        'Package',          'Productos, stock y movimientos'),
('crm',         'CRM & Clientes',    'Heart',            'Clientes, leads, pipeline y soporte'),
('purchasing',  'Compras',           'ShoppingBag',      'Órdenes de compra y proveedores'),
('documents',   'Documentos',        'Receipt',          'Documentos DIAN y electrónicos'),
('production',  'Producción',        'Factory',          'Órdenes de producción y manufactura'),
('payroll',     'Nómina',            'Calculator',       'Liquidaciones, seguridad social y PILA'),
('accounting',  'Contabilidad',      'FileText',         'PUC, libros contables y estados financieros'),
('logistics',   'Logística',         'Truck',            'Despachos, rutas y transporte'),
('settings',    'Configuración',     'Settings',         'Ajustes de organización y usuarios')
ON CONFLICT (key) DO UPDATE SET
    name        = EXCLUDED.name,
    icon        = EXCLUDED.icon,
    description = EXCLUDED.description;

-- ============================================================
-- FASE 3: Función get_my_tenant_id() SECURITY DEFINER
-- Clave para evitar ciclos en RLS: corre como owner (bypass RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM user_tenants
    WHERE user_id = auth.uid()
      AND status IN ('active', 'invited')
    ORDER BY created_at ASC
    LIMIT 1;
    RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_tenant_id() TO authenticated, service_role, anon;

-- ============================================================
-- FASE 4: Smart RLS — Aislamiento por Tenant
-- Habilitamos RLS SOLO en las tablas críticas de multi-tenancy
-- Las tablas de catálogo (app_roles, app_modules, zones) quedan
-- abiertas a authenticated para SELECT (son datos compartidos)
-- ============================================================

-- 4.1 Función auxiliar: ¿El usuario es admin del sistema?
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM user_tenants
    WHERE user_id = auth.uid()
      AND status IN ('active', 'invited')
    LIMIT 1;
    RETURN v_role IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION is_system_admin() TO authenticated, service_role;

-- 4.2 TENANTS — solo ver el tenant propio
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_tenant_isolation" ON tenants;
CREATE POLICY "tenants_tenant_isolation" ON tenants
    FOR ALL
    USING (id = get_my_tenant_id());

-- 4.3 USER_TENANTS — ver miembros del mismo tenant
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_tenants_same_tenant" ON user_tenants;
CREATE POLICY "user_tenants_same_tenant" ON user_tenants
    FOR SELECT
    USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "user_tenants_admin_write" ON user_tenants;
CREATE POLICY "user_tenants_admin_write" ON user_tenants
    FOR ALL
    USING (tenant_id = get_my_tenant_id() AND is_system_admin());

-- 4.4 PARTIES — aislamiento por tenant
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parties_tenant_isolation" ON parties;
CREATE POLICY "parties_tenant_isolation" ON parties
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- 4.5 DOCUMENTS — aislamiento por tenant
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_tenant_isolation" ON documents;
CREATE POLICY "documents_tenant_isolation" ON documents
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- 4.6 DOCUMENT_LINES — acceso a través del documento del tenant
ALTER TABLE document_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_lines_tenant_isolation" ON document_lines;
CREATE POLICY "document_lines_tenant_isolation" ON document_lines
    FOR ALL
    USING (
        document_id IN (
            SELECT id FROM documents WHERE tenant_id = get_my_tenant_id()
        )
    );

-- 4.7 PRODUCTS — aislamiento por tenant
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_tenant_isolation" ON products;
CREATE POLICY "products_tenant_isolation" ON products
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- 4.8 INVENTORY_MOVEMENTS — aislamiento por tenant
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_movements' AND schemaname = 'public') THEN
        EXECUTE 'ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "inv_movements_tenant_isolation" ON inventory_movements';
        EXECUTE 'CREATE POLICY "inv_movements_tenant_isolation" ON inventory_movements
            FOR ALL USING (tenant_id = get_my_tenant_id())';
    END IF;
END $$;

-- 4.9 LEADS — aislamiento por tenant
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_tenant_isolation" ON leads;
CREATE POLICY "leads_tenant_isolation" ON leads
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- 4.10 CRM_OPPORTUNITIES — aislamiento por tenant
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'crm_opportunities' AND schemaname = 'public') THEN
        EXECUTE 'ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "crm_opp_tenant_isolation" ON crm_opportunities';
        EXECUTE 'CREATE POLICY "crm_opp_tenant_isolation" ON crm_opportunities
            FOR ALL USING (tenant_id = get_my_tenant_id())';
    END IF;
END $$;

-- 4.11 TREASURY_TRANSACTIONS — aislamiento por tenant
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'treasury_transactions' AND schemaname = 'public') THEN
        EXECUTE 'ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "treasury_tenant_isolation" ON treasury_transactions';
        EXECUTE 'CREATE POLICY "treasury_tenant_isolation" ON treasury_transactions
            FOR ALL USING (tenant_id = get_my_tenant_id())';
    END IF;
END $$;

-- 4.12 PROFILES — cada usuario ve su propio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles
    FOR ALL
    USING (id = auth.uid());

-- 4.13 AUDIT_LOG — visible a admins del tenant
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_tenant_isolation" ON audit_log;
CREATE POLICY "audit_log_tenant_isolation" ON audit_log
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- 4.14 Tablas de catálogo: SELECT libre para autenticados, write solo admins
-- APP_ROLES
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_roles_read_all" ON app_roles;
CREATE POLICY "app_roles_read_all" ON app_roles
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "app_roles_admin_write" ON app_roles;
CREATE POLICY "app_roles_admin_write" ON app_roles
    FOR ALL USING (is_system_admin());

-- APP_MODULES
ALTER TABLE app_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_modules_read_all" ON app_modules;
CREATE POLICY "app_modules_read_all" ON app_modules
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "app_modules_admin_write" ON app_modules;
CREATE POLICY "app_modules_admin_write" ON app_modules
    FOR ALL USING (is_system_admin());

-- ROLE_PERMISSIONS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_read_all" ON role_permissions;
CREATE POLICY "role_permissions_read_all" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "role_permissions_admin_write" ON role_permissions;
CREATE POLICY "role_permissions_admin_write" ON role_permissions
    FOR ALL USING (is_system_admin());

-- ZONES
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "zones_tenant_isolation" ON zones;
CREATE POLICY "zones_tenant_isolation" ON zones
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- ============================================================
-- FASE 5: Matriz de permisos por rol (defaults sensatos)
-- ============================================================
DO $$
DECLARE
    -- UUIDs de roles
    v_super_admin UUID;
    v_admin UUID;
    v_gm UUID;
    v_sales_mgr UUID;
    v_tech_mgr UUID;
    v_jefe_adm UUID;
    v_jefe_log UUID;
    v_jefe_bio UUID;
    v_coord_alm UUID;
    v_coord_cal UUID;
    v_contador UUID;
    v_tesorero UUID;
    v_analista_compras UUID;
    v_rep_comercial UUID;
    v_asis_gerencia UUID;
    v_gestor_log UUID;
    v_asis_admin UUID;
    v_asis_log UUID;
    v_asis_comercial UUID;
    v_aux_cont UUID;
    v_aux_fact UUID;
    v_aux_log UUID;
    v_admin_bodega UUID;
    v_rep_tec UUID;
    v_conductor UUID;
    v_asis_tec UUID;
    v_op_gen UUID;
    v_aprendiz UUID;

    -- Módulos (acceso total)
    v_all_modules TEXT[] := ARRAY['dashboard','analytics','sales','inventory','crm','purchasing','documents','production','payroll','accounting','logistics','settings'];
    -- Grupos de módulos
    v_accounting_mods TEXT[] := ARRAY['dashboard','accounting','documents','analytics'];
    v_sales_mods TEXT[] := ARRAY['dashboard','sales','crm','documents','analytics'];
    v_ops_mods TEXT[] := ARRAY['dashboard','inventory','purchasing','logistics','documents'];
    v_full_ops TEXT[] := ARRAY['dashboard','inventory','purchasing','logistics','documents','production'];
    v_payroll_mods TEXT[] := ARRAY['dashboard','payroll','accounting'];
    v_treasury_mods TEXT[] := ARRAY['dashboard','accounting','documents','analytics'];
    v_driver_mods TEXT[] := ARRAY['dashboard'];

    -- Helper
    v_role_id UUID;
    v_module TEXT;
BEGIN
    -- Cargar IDs de roles
    SELECT id INTO v_super_admin  FROM app_roles WHERE name = 'SUPER ADMINISTRADOR';
    SELECT id INTO v_admin        FROM app_roles WHERE name = 'ADMINISTRADOR';
    SELECT id INTO v_gm           FROM app_roles WHERE name = 'GENERAL MANAGER';
    SELECT id INTO v_sales_mgr    FROM app_roles WHERE name = 'SALES AND MARKETING MANAGER';
    SELECT id INTO v_tech_mgr     FROM app_roles WHERE name = 'TECHNICAL MANAGER';
    SELECT id INTO v_jefe_adm     FROM app_roles WHERE name = 'JEFE ADMINISTRATIVO';
    SELECT id INTO v_jefe_log     FROM app_roles WHERE name = 'JEFE DE LOGISTICA';
    SELECT id INTO v_jefe_bio     FROM app_roles WHERE name = 'JEFE DE BIOSEGURIDAD';
    SELECT id INTO v_coord_alm    FROM app_roles WHERE name = 'COORDINADOR DE ALMACEN';
    SELECT id INTO v_coord_cal    FROM app_roles WHERE name = 'COORDINADORA DE CALIDAD Y GESTION HUMANA';
    SELECT id INTO v_contador     FROM app_roles WHERE name = 'CONTADOR';
    SELECT id INTO v_tesorero     FROM app_roles WHERE name = 'GESTOR DE TESORERIA Y CARTERA';
    SELECT id INTO v_analista_compras FROM app_roles WHERE name = 'ANALISTA DE COMPRAS';
    SELECT id INTO v_rep_comercial FROM app_roles WHERE name = 'REPRESENTANTE COMERCIAL';
    SELECT id INTO v_asis_gerencia FROM app_roles WHERE name = 'ASISTENTE DE GERENCIA VENTAS';
    SELECT id INTO v_gestor_log   FROM app_roles WHERE name = 'GESTOR LOGISTICO';
    SELECT id INTO v_asis_admin   FROM app_roles WHERE name = 'ASISTENTE ADMINISTRATIVO';
    SELECT id INTO v_asis_log     FROM app_roles WHERE name = 'ASISTENTE LOGISTICO';
    SELECT id INTO v_asis_comercial FROM app_roles WHERE name = 'ASISTENTE COMERCIAL';
    SELECT id INTO v_aux_cont     FROM app_roles WHERE name = 'AUXILIAR CONTABLE';
    SELECT id INTO v_aux_fact     FROM app_roles WHERE name = 'AUXILIAR DE FACTURACION';
    SELECT id INTO v_aux_log      FROM app_roles WHERE name = 'AUXILIAR DE LOGISTICA';
    SELECT id INTO v_admin_bodega FROM app_roles WHERE name = 'ADMINISTRADOR BODEGA';
    SELECT id INTO v_rep_tec      FROM app_roles WHERE name = 'REPRESENTANTE TECNICO';
    SELECT id INTO v_conductor    FROM app_roles WHERE name = 'CONDUCTOR';
    SELECT id INTO v_asis_tec     FROM app_roles WHERE name = 'ASISTENTE TECNICO';
    SELECT id INTO v_op_gen       FROM app_roles WHERE name = 'OPERARIA DE SERVICIOS GENERALES';
    SELECT id INTO v_aprendiz     FROM app_roles WHERE name = 'APRENDIZ SENA';

    -- Función helper local para insertar permisos
    -- Inserta para un rol dado una lista de módulos con can_view=true
    -- Usamos INSERT directo en el bloque DO

    -- Roles con acceso total
    FOR v_role_id IN SELECT unnest(ARRAY[v_super_admin, v_admin, v_gm]) LOOP
        IF v_role_id IS NOT NULL THEN
            FOREACH v_module IN ARRAY v_all_modules LOOP
                INSERT INTO role_permissions (role_id, module_key, can_view, can_edit, can_delete, can_admin)
                VALUES (v_role_id, v_module, true, true, true, true)
                ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true, can_delete = true, can_admin = true;
            END LOOP;
        END IF;
    END LOOP;

    -- Sales & Marketing Manager
    IF v_sales_mgr IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','analytics','sales','crm','documents','purchasing','inventory','settings'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_sales_mgr, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Technical Manager
    IF v_tech_mgr IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','analytics','inventory','production','logistics','purchasing'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_tech_mgr, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Jefe Administrativo
    IF v_jefe_adm IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','accounting','documents','payroll','analytics','settings','crm'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_jefe_adm, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Jefe de Logística
    IF v_jefe_log IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','logistics','inventory','purchasing','documents','analytics'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_jefe_log, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Jefe de Bioseguridad
    IF v_jefe_bio IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','production','inventory','documents'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_jefe_bio, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Coordinador de Almacén
    IF v_coord_alm IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','inventory','logistics','purchasing'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_coord_alm, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Coordinadora de Calidad y Gestión Humana
    IF v_coord_cal IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','payroll','analytics','settings'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_coord_cal, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Contador
    IF v_contador IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','accounting','documents','analytics','payroll'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_contador, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Gestor de Tesorería y Cartera
    IF v_tesorero IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','accounting','documents','analytics'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_tesorero, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Analista de Compras
    IF v_analista_compras IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','purchasing','inventory','documents'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_analista_compras, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Representante Comercial
    IF v_rep_comercial IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','sales','crm','documents'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_rep_comercial, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Asistente de Gerencia Ventas
    IF v_asis_gerencia IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','sales','crm','documents','analytics'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_asis_gerencia, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Gestor Logístico
    IF v_gestor_log IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','logistics','inventory','documents'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_gestor_log, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Asistente Administrativo
    IF v_asis_admin IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','accounting','documents','payroll'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_asis_admin, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Asistente Logístico
    IF v_asis_log IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','logistics','inventory'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_asis_log, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Asistente Comercial
    IF v_asis_comercial IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','sales','crm','documents'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_asis_comercial, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Auxiliar Contable
    IF v_aux_cont IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','accounting','documents'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_aux_cont, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Auxiliar de Facturación
    IF v_aux_fact IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','documents','sales'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_aux_fact, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Auxiliar de Logística
    IF v_aux_log IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','logistics','inventory'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_aux_log, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Administrador Bodega
    IF v_admin_bodega IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','inventory','logistics','purchasing'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_admin_bodega, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Representante Técnico
    IF v_rep_tec IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','production','inventory'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_rep_tec, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- Conductor: solo dashboard
    IF v_conductor IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_conductor, 'dashboard', true, false)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
    END IF;

    -- Asistente Técnico
    IF v_asis_tec IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['dashboard','production','inventory'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_asis_tec, v_module, true, false)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
        END LOOP;
    END IF;

    -- Operaria de Servicios Generales: solo dashboard
    IF v_op_gen IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_op_gen, 'dashboard', true, false)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
    END IF;

    -- Aprendiz SENA: solo dashboard
    IF v_aprendiz IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_aprendiz, 'dashboard', true, false)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
    END IF;
END $$;

-- ============================================================
-- FASE 6: Fix RPCs de gestión de equipo
-- update_team_member_role ahora sincroniza role_id también
-- ============================================================
CREATE OR REPLACE FUNCTION update_team_member_role(
    p_membership_id UUID,
    p_new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Obtener el role_id correspondiente al nombre del rol
    SELECT id INTO v_role_id FROM app_roles WHERE name = p_new_role;

    UPDATE user_tenants
    SET role    = p_new_role,
        role_id = v_role_id
    WHERE id = p_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_team_member_role TO authenticated, service_role;

-- update_team_member_zone: reforzar con SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_team_member_zone(
    p_membership_id UUID,
    p_new_zone_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE user_tenants SET zone_id = p_new_zone_id WHERE id = p_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_team_member_zone TO authenticated, service_role;

-- remove_team_member: reforzar con SECURITY DEFINER
CREATE OR REPLACE FUNCTION remove_team_member(
    p_membership_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM user_tenants WHERE id = p_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_team_member TO authenticated, service_role;

-- ============================================================
-- FASE 7: Sincronizar role_id para membresías existentes sin role_id
-- (usuarios ya vinculados que tienen role como texto pero role_id nulo)
-- ============================================================
UPDATE user_tenants ut
SET role_id = r.id
FROM app_roles r
WHERE ut.role = r.name
  AND ut.role_id IS NULL;

-- ============================================================
-- FASE 8: Permisos de ejecución
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role, anon;

-- Re-otorgar SELECT a anon solo en tablas no sensitivas
GRANT SELECT ON app_roles, app_modules TO anon;
