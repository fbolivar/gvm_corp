-- Persona de contacto del tercero (administrador, comprador, veterinario).
-- La usan las plantillas de WhatsApp del CRM para saludar por nombre: para una
-- razón social sin contacto el saludo es genérico ("Hola, buen día").
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS contact_name text;
COMMENT ON COLUMN public.parties.contact_name IS 'Persona de contacto (administrador, comprador, veterinario). La usan las plantillas de WhatsApp del CRM para saludar por nombre.';
