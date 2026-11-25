-- ============================================================================
-- Fuga de datos sensibles por audit_log (hallazgo de auditoría 2026-11-24)
-- ----------------------------------------------------------------------------
-- fn_audit_log guardaba to_jsonb(OLD/NEW) COMPLETO de cada tabla auditada. Para
-- `employees` eso incluía `salary` y `bank_account_number`. La RLS de audit_log
-- es solo por tenant (sin chequeo de rol), así que cualquier usuario del tenant
-- podía leer esos salarios por /settings/audit, el export CSV o PostgREST,
-- saltándose la protección de salarios de la tabla `employees` (can_view_payroll).
--
-- Fix de RAÍZ: el trigger deja de copiar columnas sensibles al payload. Así,
-- ninguna vía de lectura de audit_log (UI, export, API, PostgREST directo) puede
-- devolver un salario, porque el dato ya no está ahí. Se limpia también el
-- histórico ya grabado.
-- ============================================================================

-- 1) Trigger: eliminar columnas sensibles del old/new antes de guardarlas.
CREATE OR REPLACE FUNCTION public.fn_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tenant_id UUID;
    v_entity_id TEXT;
    v_old JSONB;
    v_new JSONB;
    v_actor UUID;
    -- Columnas que NUNCA deben quedar en el rastro de auditoría. audit_log tiene
    -- RLS más laxa que las tablas origen; copiar estas columnas filtraría datos
    -- protegidos por rol (salarios, datos bancarios, secretos).
    v_sensitive TEXT[] := ARRAY[
        'salary','salary_bonus','commissions','bonus','transport_allowance',
        'bank_account_number','bank_account','bank_name','bank_account_type',
        'certificate','certificate_base64','certificate_password','cert_password',
        'pin','password','private_key','secret','key_hash','api_key'
    ];
BEGIN
    BEGIN
        IF TG_OP = 'DELETE' THEN v_tenant_id := OLD.tenant_id;
        ELSE v_tenant_id := NEW.tenant_id; END IF;
    EXCEPTION WHEN undefined_column THEN
        v_tenant_id := public.get_my_tenant_id();
    END;

    IF TG_OP = 'DELETE' THEN v_entity_id := OLD.id::TEXT;
    ELSE v_entity_id := NEW.id::TEXT; END IF;

    -- `jsonb - text[]` elimina todas esas claves si existen (no falla si no están).
    IF TG_OP IN ('UPDATE', 'DELETE') THEN v_old := to_jsonb(OLD) - v_sensitive; END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN v_new := to_jsonb(NEW) - v_sensitive; END IF;

    v_actor := auth.uid();
    IF v_actor IS NULL THEN
        BEGIN
            v_actor := NULLIF(current_setting('request.headers', true)::json ->> 'x-actor-id', '')::uuid;
        EXCEPTION WHEN OTHERS THEN v_actor := NULL;
        END;
    END IF;

    INSERT INTO audit_log (tenant_id, actor_user_id, action, entity, entity_id, payload)
    VALUES (v_tenant_id, v_actor, TG_OP, TG_TABLE_NAME, v_entity_id,
            jsonb_build_object('old', v_old, 'new', v_new));

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2) Limpiar el histórico ya grabado: quitar esas claves de old/new en las filas
--    existentes (solo las que de verdad las tienen, para no reescribir toda la tabla).
UPDATE audit_log
SET payload = jsonb_build_object(
    'old', CASE WHEN jsonb_typeof(payload->'old') = 'object'
                THEN (payload->'old') - ARRAY[
                    'salary','salary_bonus','commissions','bonus','transport_allowance',
                    'bank_account_number','bank_account','bank_name','bank_account_type',
                    'certificate','certificate_base64','certificate_password','cert_password',
                    'pin','password','private_key','secret','key_hash','api_key']
                ELSE payload->'old' END,
    'new', CASE WHEN jsonb_typeof(payload->'new') = 'object'
                THEN (payload->'new') - ARRAY[
                    'salary','salary_bonus','commissions','bonus','transport_allowance',
                    'bank_account_number','bank_account','bank_name','bank_account_type',
                    'certificate','certificate_base64','certificate_password','cert_password',
                    'pin','password','private_key','secret','key_hash','api_key']
                ELSE payload->'new' END
)
WHERE jsonb_typeof(payload) = 'object'
  AND (
        (jsonb_typeof(payload->'old') = 'object' AND (payload->'old') ?| ARRAY[
            'salary','salary_bonus','commissions','bonus','transport_allowance',
            'bank_account_number','bank_account','bank_name','bank_account_type',
            'certificate','certificate_base64','certificate_password','cert_password',
            'pin','password','private_key','secret','key_hash','api_key'])
     OR (jsonb_typeof(payload->'new') = 'object' AND (payload->'new') ?| ARRAY[
            'salary','salary_bonus','commissions','bonus','transport_allowance',
            'bank_account_number','bank_account','bank_name','bank_account_type',
            'certificate','certificate_base64','certificate_password','cert_password',
            'pin','password','private_key','secret','key_hash','api_key'])
  );
