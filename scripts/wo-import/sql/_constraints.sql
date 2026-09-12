select conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.parties'::regclass
  and pg_get_constraintdef(oid) ilike '%taxpayer%';
