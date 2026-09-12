-- Fase 1 (Terceros): nombres separados para Información Exógena.
-- Persona natural: primer/segundo nombre + primer/segundo apellido.
-- Persona jurídica: razón social sigue en legal_name.
ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS first_name     text,
  ADD COLUMN IF NOT EXISTS second_name    text,
  ADD COLUMN IF NOT EXISTS first_surname  text,
  ADD COLUMN IF NOT EXISTS second_surname text;

COMMENT ON COLUMN public.parties.first_name     IS 'Primer nombre (persona natural) — Exógena';
COMMENT ON COLUMN public.parties.second_name    IS 'Segundo nombre / otros nombres (persona natural) — Exógena';
COMMENT ON COLUMN public.parties.first_surname  IS 'Primer apellido (persona natural) — Exógena';
COMMENT ON COLUMN public.parties.second_surname IS 'Segundo apellido (persona natural) — Exógena';

-- Backfill seguro del DV pegado con guion: solo el patrón exacto "dígitos-dígito"
-- y solo cuando el DV está vacío. No toca ningún otro registro.
UPDATE public.parties
SET dv = split_part(doc_number, '-', 2),
    doc_number = split_part(doc_number, '-', 1)
WHERE doc_number ~ '^[0-9]+-[0-9]$'
  AND (dv IS NULL OR dv = '');
