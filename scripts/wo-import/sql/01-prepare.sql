create table if not exists public.parties_backup_wo_20260824 as table public.parties;

alter table public.parties
    add column if not exists applies_reteica boolean not null default false,
    add column if not exists ica_rate numeric(8,6);

comment on column public.parties.applies_reteica is 'El tercero nos practica ReteICA (dato traido de WorldOffice).';
comment on column public.parties.ica_rate is 'Tarifa ICA del tercero como fraccion (0.00414 = 4,14 por mil).';

insert into public.taxpayer_types (code, name, is_active, sort_order)
values ('ENTIDAD_ESTATAL', 'Instituciones del Estado Publicos y Otros', true, 125)
on conflict (code) do nothing;
