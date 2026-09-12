select
  (select count(1) from public.tax_configurations
     where year=2026 and tax_name = 'Retención de IVA por ventas') as reteiva_ok,
  (select count(1) from public.tax_configurations
     where year=2026 and tax_name = 'Retención de ICA Bogotá (4,14 x 1000)') as reteica_bogota_ok,
  (select count(1) from public.tax_configurations
     where year=2026 and tax_name ~ 'Ã') as tarifas_dobleenc,
  (select count(1) from public.parties where first_name = 'MARÍA') as maria_ok,
  (select count(1) from public.parties where city = 'Medellín') as medellin_ok,
  (select count(1) from public.parties where city = 'Fusagasugá') as fusa_ok;
