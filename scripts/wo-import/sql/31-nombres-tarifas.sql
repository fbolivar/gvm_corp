-- Nombres legibles de las tarifas (venían con doble codificación de una carga previa).
update public.tax_configurations set tax_name = 'Autorretención de renta 0,55%'      where tax_type = 'AUTORRENTA' and year = 2026;
update public.tax_configurations set tax_name = 'Retención en la fuente por ventas'  where tax_type = 'RETEFUENTE' and year = 2026;
update public.tax_configurations set tax_name = 'Retención de IVA por ventas'        where tax_type = 'RETEIVA'    and year = 2026;
update public.tax_configurations set tax_name = 'Retención de ICA Bogotá (4,14 x 1000)' where tax_type = 'RETEICA' and year = 2026 and city = 'Bogota D.C.';
update public.tax_configurations set tax_name = 'Retención de ICA Entrerríos (5 x 1000)' where tax_type = 'RETEICA' and year = 2026 and city = 'Entrerrios';
update public.tax_configurations set tax_name = 'Retención de ICA La Ceja (7 x 1000)'    where tax_type = 'RETEICA' and year = 2026 and city = 'La Ceja';
update public.tax_configurations set tax_name = 'Retención de ICA Fómeque (4 x 1000)'    where tax_type = 'RETEICA' and year = 2026 and city = 'Fomeque';
