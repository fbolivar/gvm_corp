-- Corrección URGENTE del endurecimiento 20260917090000: el grep de llamadas
-- `rpc('nombre')` no detectó dos llamadas escritas en varias líneas
-- (`client.rpc(\n 'next_delivery_note_number', ...)`), se revocó EXECUTE y las
-- remisiones quedaron bloqueadas ("Error desconocido" al convertir un pedido).
-- Ambas funciones validan el tenant por dentro; se restauran a authenticated.
GRANT EXECUTE ON FUNCTION public.next_delivery_note_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_stock_for_document(uuid) TO authenticated;
