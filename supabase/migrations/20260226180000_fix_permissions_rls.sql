-- ============================================================
-- FIX DEFINITIVO: Permisos de Roles en Sidebar
-- EJECUTAR EN: supabase.com → SQL Editor
-- ============================================================

-- PASO 1: Política SELECT para que cualquier usuario autenticado
--         pueda leer sus propios permisos por role_id
DROP POLICY IF EXISTS "Allow admin write role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Allow authenticated read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Allow admin manage role_permissions" ON role_permissions;

-- Lectura: cualquier usuario autenticado puede leer role_permissions
-- (necesario para que el sidebar consulte los permisos del rol)
CREATE POLICY "Allow authenticated read role_permissions"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

-- Escritura: solo admins pueden modificar permisos
CREATE POLICY "Allow admin manage role_permissions"
ON role_permissions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenants
        WHERE user_id = auth.uid()
        AND role IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'admin', 'owner')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_tenants
        WHERE user_id = auth.uid()
        AND role IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'admin', 'owner')
    )
);

-- PASO 2: RLS en app_roles (lectura para todos autenticados)
DROP POLICY IF EXISTS "Allow authenticated read app_roles" ON app_roles;
CREATE POLICY "Allow authenticated read app_roles"
ON app_roles FOR SELECT
TO authenticated
USING (true);

-- PASO 3: RLS en app_modules (lectura para todos autenticados)
DROP POLICY IF EXISTS "Allow authenticated read app_modules" ON app_modules;
CREATE POLICY "Allow authenticated read app_modules"
ON app_modules FOR SELECT
TO authenticated
USING (true);

-- PASO 4: Asegurar que role_permissions tenga datos para ADMINISTRADOR BODEGA
-- Primero vamos a ver qué hay
SELECT 
    r.name as rol,
    count(rp.id) as permisos_totales,
    sum(case when rp.can_view then 1 else 0 end) as modulos_visibles
FROM app_roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.name
ORDER BY r.name;

-- PASO 5: Inicializar permisos para TODOS los roles que no tengan ninguno
-- (Con default: solo dashboard visible)
INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
SELECT r.id, m.key, 
    CASE WHEN m.key = 'dashboard' THEN true ELSE false END,
    false
FROM app_roles r
CROSS JOIN app_modules m
WHERE r.name NOT IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'admin', 'owner')
ON CONFLICT (role_id, module_key) DO NOTHING;

-- PASO 6: Para ADMINISTRADOR BODEGA específicamente → solo inventory
UPDATE role_permissions rp
SET can_view = true, can_edit = true
FROM app_roles r
WHERE rp.role_id = r.id
AND r.name = 'ADMINISTRADOR BODEGA'
AND rp.module_key IN ('dashboard', 'inventory');

-- PASO 7: Asegurar SUPER ADMIN y ADMIN tienen todo
INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
SELECT r.id, m.key, true, true
FROM app_roles r, app_modules m
WHERE r.name IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR')
ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;

-- PASO 8: Actualizar función RPC (sin tenant_id ya que role_permissions no lo tiene)
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

-- VERIFICACIÓN FINAL
SELECT 
    r.name as rol,
    string_agg(rp.module_key, ', ' ORDER BY rp.module_key) FILTER (WHERE rp.can_view) as modulos_con_acceso
FROM app_roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.name
ORDER BY r.name;
