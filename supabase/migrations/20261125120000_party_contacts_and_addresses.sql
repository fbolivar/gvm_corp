
-- Directorio comercial por cliente: contactos (personas) y direcciones.
-- Pensado para que la información del cliente quede en la empresa aunque cambie el
-- comercial (contactos con cargo, teléfonos, importancia; direcciones por sede).
-- Multi-tenant con RLS por tenant; party_id en cascada para no dejar huérfanos.

CREATE TABLE IF NOT EXISTS public.party_contacts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL,
    party_id    uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    name        text NOT NULL,
    role        text,            -- cargo: Responsable de compras, Pagos, Gerencia, Técnico, Otro…
    phone       text,
    mobile      text,
    email       text,
    is_primary  boolean NOT NULL DEFAULT false,
    notes       text,
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.party_addresses (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL,
    party_id    uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    label       text,            -- Sede principal, Bodega norte, Punto de entrega…
    kind        text,            -- SEDE, BODEGA, ENTREGA, FACTURACION, OTRO
    address     text NOT NULL,
    city        text,
    phone       text,
    notes       text,
    is_primary  boolean NOT NULL DEFAULT false,
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS party_contacts_tenant_party_idx ON public.party_contacts (tenant_id, party_id);
CREATE INDEX IF NOT EXISTS party_contacts_name_idx ON public.party_contacts (tenant_id, lower(name));
CREATE INDEX IF NOT EXISTS party_addresses_tenant_party_idx ON public.party_addresses (tenant_id, party_id);

ALTER TABLE public.party_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_addresses ENABLE ROW LEVEL SECURITY;

-- Aislamiento por tenant (lectura y escritura solo del propio tenant).
CREATE POLICY party_contacts_tenant ON public.party_contacts
    FOR ALL TO authenticated
    USING (tenant_id = public.get_my_tenant_id())
    WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY party_addresses_tenant ON public.party_addresses
    FOR ALL TO authenticated
    USING (tenant_id = public.get_my_tenant_id())
    WITH CHECK (tenant_id = public.get_my_tenant_id());
