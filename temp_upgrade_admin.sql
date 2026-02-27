DO $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    -- 1. Buscar el usuario por email
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'fbolivarb@gmail.com';
    
    -- 2. Buscar el ID del rol SUPER ADMINISTRADOR (o ADMINISTRADOR si no existe)
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'SUPER ADMINISTRADOR';
    IF v_role_id IS NULL THEN
        SELECT id INTO v_role_id FROM app_roles WHERE name = 'ADMINISTRADOR';
    END IF;

    -- 3. Actualizar la membresía del usuario
    IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        UPDATE user_tenants 
        SET 
            role = (SELECT name FROM app_roles WHERE id = v_role_id),
            role_id = v_role_id,
            status = 'active'
        WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Usuario fbolivarb@gmail.com actualizado a ADMINISTRADOR con éxito.';
    ELSE
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró el usuario fbolivarb@gmail.com';
        ELSE
            RAISE EXCEPTION 'No se encontró el rol ADMINISTRADOR';
        END IF;
    END IF;
END $$;
