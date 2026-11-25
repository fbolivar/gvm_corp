
-- Portal público de cliente por TOKEN (auditoría 2026-11-24). Antes /portal/[partyId]
-- exponía el estado de cuenta por el UUID del tercero (sin token, sin vigencia). Se
-- añade un token aleatorio con expiración, revocable. El enlace se genera a demanda
-- desde la app; nada se expone sin un token válido y vigente.
alter table public.parties
  add column if not exists portal_token text,
  add column if not exists portal_token_expires_at timestamptz;

create unique index if not exists parties_portal_token_key
  on public.parties (portal_token) where portal_token is not null;
