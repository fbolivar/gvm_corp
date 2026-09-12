select tax_type, tax_name, rate, min_base, coalesce(city,'(todas)') as ciudad, account_code, is_active
from public.tax_configurations
where year = 2026
order by tax_type, is_active desc, ciudad;
