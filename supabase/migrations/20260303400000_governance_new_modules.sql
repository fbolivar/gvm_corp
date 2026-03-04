-- ============================================================
-- Governance Update: Add 7 new modules for new functionalities
-- treasury, quality, maintenance, training, contracts, dian, support
-- ============================================================

-- FASE 1: Add new modules
INSERT INTO app_modules (key, name, icon, description) VALUES
('treasury',    'Tesoreria',          'Landmark',       'Cuentas bancarias, cartera, flujo de caja y conciliacion'),
('quality',     'Calidad QC',         'ShieldCheck',    'Inspecciones de calidad, no conformidades (NCR)'),
('maintenance', 'Mantenimiento',      'Wrench',         'Equipos, ordenes de mantenimiento preventivo y correctivo'),
('training',    'Capacitacion',       'GraduationCap',  'Programas de capacitacion y registros de empleados'),
('contracts',   'Contratos',          'FileSignature',  'Gestion de contratos con clientes, proveedores y empleados'),
('dian',        'DIAN',               'FileDigit',      'Facturacion electronica, nomina electronica y resoluciones'),
('support',     'Soporte',            'Headset',        'Tickets de soporte, atencion al cliente')
ON CONFLICT (key) DO UPDATE SET
    name        = EXCLUDED.name,
    icon        = EXCLUDED.icon,
    description = EXCLUDED.description;

-- FASE 2: Insert permissions for all roles
-- Use a DO block to assign module access by role
DO $$
DECLARE
    v_all_new TEXT[] := ARRAY['treasury','quality','maintenance','training','contracts','dian','support'];
    v_role_id UUID;
    v_module TEXT;
BEGIN
    -- ═══ Full Access Roles (Super Admin, Admin, GM) ═══
    FOR v_role_id IN
        SELECT id FROM app_roles WHERE name IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'GENERAL MANAGER')
    LOOP
        FOREACH v_module IN ARRAY v_all_new LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit, can_delete, can_admin)
            VALUES (v_role_id, v_module, true, true, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true, can_delete = true, can_admin = true;
        END LOOP;
    END LOOP;

    -- ═══ Sales & Marketing Manager: support, contracts, dian ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'SALES AND MARKETING MANAGER';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['support','contracts','dian'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Technical Manager: quality, maintenance, training ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'TECHNICAL MANAGER';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['quality','maintenance','training'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Jefe Administrativo: treasury, contracts, dian, training ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'JEFE ADMINISTRATIVO';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['treasury','contracts','dian','training'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Jefe de Logistica: maintenance ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'JEFE DE LOGISTICA';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_role_id, 'maintenance', true, true)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
    END IF;

    -- ═══ Jefe de Bioseguridad: quality, maintenance ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'JEFE DE BIOSEGURIDAD';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['quality','maintenance'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Coordinador de Almacen: maintenance (view only) ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'COORDINADOR DE ALMACEN';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_role_id, 'maintenance', true, false)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
    END IF;

    -- ═══ Coordinadora de Calidad y Gestion Humana: quality, training, support ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'COORDINADORA DE CALIDAD Y GESTION HUMANA';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['quality','training','support'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Contador: treasury, dian ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'CONTADOR';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['treasury','dian'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Gestor de Tesoreria y Cartera: treasury, dian ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'GESTOR DE TESORERIA Y CARTERA';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['treasury','dian'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Representante Comercial: support ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'REPRESENTANTE COMERCIAL';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_role_id, 'support', true, true)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
    END IF;

    -- ═══ Asistente de Gerencia Ventas: support, contracts ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'ASISTENTE DE GERENCIA VENTAS';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['support','contracts'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, true)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
        END LOOP;
    END IF;

    -- ═══ Asistente Comercial: support ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'ASISTENTE COMERCIAL';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_role_id, 'support', true, true)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
    END IF;

    -- ═══ Auxiliar de Facturacion: dian ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'AUXILIAR DE FACTURACION';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_role_id, 'dian', true, true)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
    END IF;

    -- ═══ Auxiliar Contable: treasury (view only) ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'AUXILIAR CONTABLE';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_role_id, 'treasury', true, false)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
    END IF;

    -- ═══ Representante Tecnico: quality, maintenance (view only) ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'REPRESENTANTE TECNICO';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['quality','maintenance'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, false)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
        END LOOP;
    END IF;

    -- ═══ Asistente Tecnico: quality, maintenance (view only) ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'ASISTENTE TECNICO';
    IF v_role_id IS NOT NULL THEN
        FOREACH v_module IN ARRAY ARRAY['quality','maintenance'] LOOP
            INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
            VALUES (v_role_id, v_module, true, false)
            ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
        END LOOP;
    END IF;

    -- ═══ Administrador Bodega: quality (view only) ═══
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'ADMINISTRADOR BODEGA';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
        VALUES (v_role_id, 'quality', true, false)
        ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
    END IF;

    -- Remaining roles (Conductor, Operaria, Aprendiz, Gestor Logistico, Asistente Administrativo, Asistente Logistico, Analista Compras)
    -- get NO access to new modules (dashboard-only or their existing scope suffices)

END $$;
