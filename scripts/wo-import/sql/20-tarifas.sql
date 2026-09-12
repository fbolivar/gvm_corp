-- FASE 2 — Tarifas de retención confirmadas en la reunión del 2026-08-24.
--   Retefuente : 2,5% sobre la base de ingresos (4135), desde $524.000
--   ReteICA    : 4,14 x 1000 = 0,414% — SOLO Bogotá → Bogotá
--   ReteIVA    : 15% sobre el valor del IVA (solo régimen especial)
--   Autorrenta : 0,55% (ya estaba correcta)

-- Variantes sueltas de la ciudad: si no coinciden exacto, el filtro de ReteICA
-- del motor las dejaría fuera.
update public.parties
   set city = 'Bogota D.C.'
 where city ilike '%bogot%' and city <> 'Bogota D.C.';

update public.tax_configurations
   set rate = 2.5, min_base = 524000, city = null
 where tax_type = 'RETEFUENTE' and year = 2026;

update public.tax_configurations
   set rate = 15, min_base = 0, city = null
 where tax_type = 'RETEIVA' and year = 2026;

-- ReteICA: la tarifa es 4,14 x 1000. Queda atada a Bogotá; sin umbral mínimo
-- confirmado por el contador, se practica desde el primer peso a los terceros
-- marcados con "aplica ReteICA".
update public.tax_configurations
   set rate = 0.414, min_base = 0, city = 'Bogota D.C.'
 where tax_type = 'RETEICA' and year = 2026;

-- Tarifas de los otros municipios: se dejan REGISTRADAS PERO INACTIVAS porque
-- no se practican en la factura, sino cuando el cliente paga.
insert into public.tax_configurations (tenant_id, year, tax_type, tax_name, rate, min_base, city, account_code, is_active)
select t.tenant_id, 2026, 'RETEICA', v.nombre, v.tarifa, 0, v.ciudad, '13551801', false
  from (select tenant_id from public.tax_configurations where year = 2026 limit 1) t
 cross join (values
        ('Retención de ICA Entrerrios (5 x 1000)', 0.5, 'Entrerrios'),
        ('Retención de ICA La Ceja (7 x 1000)',    0.7, 'La Ceja'),
        ('Retención de ICA Fomeque (4 x 1000)',    0.4, 'Fomeque')
     ) as v(nombre, tarifa, ciudad)
 where not exists (
        select 1 from public.tax_configurations x
         where x.year = 2026 and x.tax_type = 'RETEICA' and x.city = v.ciudad);
