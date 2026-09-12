-- Cuando un documento cambia de tipo (ej. Cotización → Pedido) y su número ya no
-- corresponde al nuevo tipo, se le asigna el consecutivo correcto del nuevo tipo.
-- (El trigger de numeración original solo actuaba en INSERT, por eso una cotización
--  que se volvía pedido conservaba el número QUO-.)
CREATE OR REPLACE FUNCTION public.set_document_number_on_type_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
    v_prefix TEXT;
BEGIN
    IF NEW.doc_type IS DISTINCT FROM OLD.doc_type THEN
        v_prefix := CASE NEW.doc_type::TEXT
            WHEN 'QUOTATION' THEN 'QUO'
            WHEN 'SALES_ORDER' THEN 'SO'
            WHEN 'INVOICE' THEN 'INV'
            WHEN 'RECEIPT' THEN 'REC'
            WHEN 'VENDOR_BILL' THEN 'VB'
            WHEN 'PURCHASE_ORDER' THEN 'PO'
            WHEN 'CREDIT_NOTE' THEN 'CN'
            WHEN 'DEBIT_NOTE' THEN 'DN'
            ELSE 'DOC'
        END;
        IF NEW.number IS NULL OR NEW.number !~ ('^' || v_prefix || '-[0-9]+$') THEN
            NEW.number := generate_document_number(NEW.tenant_id, NEW.doc_type);
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_document_number_on_type_change ON public.documents;
CREATE TRIGGER trg_document_number_on_type_change
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_document_number_on_type_change();
