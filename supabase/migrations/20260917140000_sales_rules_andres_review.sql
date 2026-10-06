-- Ajustes a la contabilización automática de ventas según la revisión del
-- contador (Andrés, 2026-09-17: "Lista de observaciones Simulación contable").
--
-- 1. ReteICA solo la practican grandes contribuyentes, ESAL y entidades del
--    Estado (y solo Bogotá). Personas jurídicas comunes y personas naturales: no.
-- 2. Entidades del Estado: misma contabilización que Gran Contribuyente
--    Autorretenedor (13551501, 13551701, 13551801 si es de Bogotá).
-- 3. Ventas del exterior: ingreso, autorrenta y cartera en 13051001; sin retefuente.
-- 4. Flete cobrado al cliente: ingreso 423510, fuera de la base de retenciones.
-- 5. Base mínima de ReteICA: $1.414.000.
-- 6. Régimen simple: solo autorrenta (ya era así; se deja constancia).

-- 4a. Concepto nuevo para el flete.
ALTER TABLE public.accounting_rules DROP CONSTRAINT IF EXISTS accounting_rules_concept_check;
ALTER TABLE public.accounting_rules ADD CONSTRAINT accounting_rules_concept_check
    CHECK (concept = ANY (ARRAY['CARTERA','INGRESO','INGRESO_FLETE','IVA','RETEFUENTE','RETEICA','RETEIVA','AUTORRENTA_ANTICIPO','AUTORRENTA_PASIVO']));

-- 1. ReteICA solo para los tipos que sí la practican.
DELETE FROM public.accounting_rules
 WHERE concept = 'RETEICA'
   AND taxpayer_code NOT IN ('GC_AUTORRET', 'GC_NO_AUTORRET', 'ESAL', 'ENTIDAD_ESTATAL');

-- 2. Entidades del Estado = copia de Gran Contribuyente Autorretenedor.
INSERT INTO public.accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT tenant_id, doc_kind, iva_rate, payment_form, 'ENTIDAD_ESTATAL', account_code, nature, concept, is_active
  FROM public.accounting_rules
 WHERE taxpayer_code = 'GC_AUTORRET'
ON CONFLICT (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature) DO NOTHING;

-- 3. Exterior: sin retefuente, cartera en clientes del exterior.
DELETE FROM public.accounting_rules WHERE taxpayer_code = 'EXTERIOR' AND concept = 'RETEFUENTE';
INSERT INTO public.accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT DISTINCT tenant_id, doc_kind, iva_rate, payment_form, 'EXTERIOR', '13051001',
       CASE WHEN doc_kind = 'FV' THEN 'D' ELSE 'C' END, 'CARTERA', true
  FROM public.accounting_rules
 WHERE taxpayer_code = 'EXTERIOR' AND concept = 'INGRESO'
ON CONFLICT (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature) DO NOTHING;

-- 4b. Flete: 423510 para toda combinación documento × forma de pago × tipo.
INSERT INTO public.accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT DISTINCT tenant_id, doc_kind, 0, payment_form, taxpayer_code, '423510',
       CASE WHEN doc_kind = 'FV' THEN 'C' ELSE 'D' END, 'INGRESO_FLETE', true
  FROM public.accounting_rules
 WHERE concept = 'INGRESO'
ON CONFLICT (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature) DO NOTHING;

-- 5. Base mínima ReteICA.
UPDATE public.tax_configurations SET min_base = 1414000 WHERE tax_type = 'RETEICA';

-- 6. Terceros corregidos por el contador.
UPDATE public.parties SET taxpayer_type = 'GC_NO_AUTORRET' WHERE legal_name = 'ARANGO HERMANOS SAS' AND is_customer;
UPDATE public.parties SET taxpayer_type = 'PJ' WHERE legal_name IN ('AGROVET SOLUCIONES PECUARIAS DEL ORIENTE SAS', 'PORCICOLA LOS CLAVELES S.A.S') AND is_customer;
