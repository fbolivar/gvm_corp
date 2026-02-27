-- MIGRACIÓN DE URGENCIA: Elevar privilegios de fbolivarb@gmail.com
DO $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    -- 1. Buscar el usuario por email en la tabla interna de Supabase Auth
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'fbolivarb@gmail.com';
    
    -- 2. Identificar el rol maestro de la nueva infraestructura de Gobernanza
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'SUPER ADMINISTRADOR';
    
    -- 3. Si por alguna razón no existe SUPER ADMINISTRADOR, degradar a ADMINISTRADOR
    IF v_role_id IS NULL THEN
        SELECT id INTO v_role_id FROM app_roles WHERE name = 'ADMINISTRADOR';
    END IF;

    -- 4. Ejecutar la promoción en user_tenants
    IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        -- Intentar actualización de membresía existente
        UPDATE user_tenants 
        SET 
            role = (SELECT name FROM app_roles WHERE id = v_role_id),
            role_id = v_role_id,
            status = 'active'
        WHERE user_id = v_user_id;

        -- Si no tenía membresía previa en ningún tenant, vincular al primero disponible
        IF NOT FOUND THEN
            INSERT INTO user_tenants (tenant_id, user_id, role, role_id, status)
            SELECT id, v_user_id, (SELECT name FROM app_roles WHERE id = v_role_id), v_role_id, 'active'
            FROM tenants
            LIMIT 1;
        END IF;
        
        RAISE NOTICE 'Promoción de fbolivarb@gmail.com completada.';
    END IF;
END $$;
