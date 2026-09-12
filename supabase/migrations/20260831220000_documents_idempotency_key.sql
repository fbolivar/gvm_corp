-- Idempotencia en la creación de documentos.
--
-- Contexto: el 2026-08-31 un doble clic sostenido creó 25 pedidos idénticos
-- (SO-01590..SO-01614) en 14 segundos. Deshabilitar el botón en el cliente cubre
-- el caso normal, pero no un reintento desde otra pestaña ni un reenvío tras un
-- error de red. La clave de idempotencia lo cierra en la base: dos peticiones
-- que representan el MISMO intento de guardado comparten clave y solo una fila
-- puede existir con ella.
alter table public.documents
    add column if not exists idempotency_key text;

comment on column public.documents.idempotency_key is
    'Clave única por intento de guardado, generada en el formulario. Evita documentos duplicados por doble clic, reintento tras error de red o envío desde otra pestaña.';

-- Índice parcial: los documentos históricos (y los creados por procesos internos
-- sin clave) quedan fuera de la restricción.
create unique index if not exists documents_idempotency_key_uniq
    on public.documents (tenant_id, idempotency_key)
    where idempotency_key is not null;

-- Soporta la búsqueda de duplicados recientes por huella de contenido.
create index if not exists documents_dup_lookup_idx
    on public.documents (tenant_id, doc_type, party_id, issue_date, created_at desc);
