-- ============================================================================
-- Ensure all tenant_id FKs cascade on DELETE so super admin can drop tenants
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_constraint_name TEXT;
BEGIN
  FOR r IN
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'tenant_id'
      AND rc.delete_rule != 'CASCADE'
  LOOP
    RAISE NOTICE 'Dropping non-cascade FK % on %.%', r.constraint_name, r.table_schema, r.table_name;

    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.table_schema, r.table_name, r.constraint_name
    );

    v_constraint_name := r.constraint_name;

    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE',
      r.table_schema, r.table_name, v_constraint_name
    );

    RAISE NOTICE '  Replaced with CASCADE version';
  END LOOP;
END $$;
