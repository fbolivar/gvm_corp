-- Limpia los textos que quedaron con tildes rotas por la primera pasada de
-- importación (se leyó el SQL en ANSI). Se vacían para que el reproceso de los
-- lotes los vuelva a escribir bien desde el Excel.
update public.parties set first_name     = null where first_name     like '%' || chr(65533) || '%';
update public.parties set second_name    = null where second_name    like '%' || chr(65533) || '%';
update public.parties set first_surname  = null where first_surname  like '%' || chr(65533) || '%';
update public.parties set second_surname = null where second_surname like '%' || chr(65533) || '%';
update public.parties set city              = null where city              like '%' || chr(65533) || '%';
update public.parties set economic_activity = null where economic_activity like '%' || chr(65533) || '%';
