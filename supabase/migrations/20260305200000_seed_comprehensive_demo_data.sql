-- ============================================================
-- SEED: Comprehensive Demo Data for ALL Modules
-- GVM CORPORATION GLOBAL VETERINARY MEDICINE S.A.S
-- Date: 2026-03-05
-- ============================================================

DO $$
DECLARE
    _tid uuid := 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9';
    _admin uuid := '4d529f53-df07-434d-a7b6-d3e9b3f34634';
BEGIN

-- ============================================================
-- 1. IT ASSETS (Tecnología) — 12 activos
-- ============================================================
INSERT INTO it_assets (id, tenant_id, name, category, brand, model, serial_number, purchase_date, purchase_cost, warranty_expiry, status, condition, specs, notes) VALUES
('a1a00001-0000-0000-0000-000000000001', _tid, 'PC Escritorio Recepción', 'DESKTOP', 'Dell', 'OptiPlex 7020', 'DLOPX7020-001', '2024-06-15', 3200000, '2027-06-15', 'ASSIGNED', 'GOOD', '{"ram":"16GB","disco":"512GB SSD","procesador":"Intel i7-13700","so":"Windows 11 Pro"}', 'Equipo principal de recepción'),
('a1a00002-0000-0000-0000-000000000001', _tid, 'Portátil Gerencia', 'LAPTOP', 'Lenovo', 'ThinkPad X1 Carbon Gen 11', 'LNTPX1C-002', '2025-01-10', 7500000, '2028-01-10', 'ASSIGNED', 'NEW', '{"ram":"32GB","disco":"1TB SSD","procesador":"Intel i7-1365U","pantalla":"14 2.8K"}', 'Laptop del director general'),
('a1a00003-0000-0000-0000-000000000001', _tid, 'iMac Diseño Gráfico', 'DESKTOP', 'Apple', 'iMac M3 24', 'APLIMAC-003', '2025-03-20', 9800000, '2028-03-20', 'ASSIGNED', 'NEW', '{"ram":"24GB","disco":"1TB SSD","procesador":"Apple M3","pantalla":"24 4.5K Retina"}', 'Departamento de marketing y diseño'),
('a1a00004-0000-0000-0000-000000000001', _tid, 'PC Contabilidad', 'DESKTOP', 'HP', 'ProDesk 400 G9', 'HPPD400-004', '2023-11-05', 2800000, '2026-11-05', 'ASSIGNED', 'GOOD', '{"ram":"16GB","disco":"256GB SSD","procesador":"Intel i5-12500","so":"Windows 11 Pro"}', 'Equipo del área contable'),
('a1a00005-0000-0000-0000-000000000001', _tid, 'Portátil Veterinario Campo', 'LAPTOP', 'Dell', 'Latitude 5540 Rugged', 'DLLAT5540-005', '2025-02-28', 5200000, '2028-02-28', 'ASSIGNED', 'NEW', '{"ram":"16GB","disco":"512GB SSD","procesador":"Intel i5-1345U","pantalla":"15.6 FHD"}', 'Portátil resistente para trabajo en campo'),
('a1a00006-0000-0000-0000-000000000001', _tid, 'Celular Vendedor 1', 'MOBILE', 'Samsung', 'Galaxy A54 5G', 'SMGA54-006', '2025-04-01', 1350000, '2027-04-01', 'ASSIGNED', 'GOOD', '{"ram":"8GB","almacenamiento":"256GB","pantalla":"6.4 Super AMOLED"}', 'Celular para equipo comercial'),
('a1a00007-0000-0000-0000-000000000001', _tid, 'Celular Vendedor 2', 'MOBILE', 'Samsung', 'Galaxy A54 5G', 'SMGA54-007', '2025-04-01', 1350000, '2027-04-01', 'ASSIGNED', 'GOOD', '{"ram":"8GB","almacenamiento":"256GB","pantalla":"6.4 Super AMOLED"}', 'Celular para equipo comercial'),
('a1a00008-0000-0000-0000-000000000001', _tid, 'Impresora Multifuncional Oficina', 'PRINTER', 'HP', 'LaserJet Pro MFP 4103fdw', 'HPLJ4103-008', '2024-09-12', 2100000, '2027-09-12', 'AVAILABLE', 'GOOD', '{"tipo":"Laser Color","velocidad":"40 ppm","conectividad":"WiFi, USB, Ethernet"}', 'Impresora compartida del piso 1'),
('a1a00009-0000-0000-0000-000000000001', _tid, 'Impresora Térmica Bodega', 'PRINTER', 'Zebra', 'ZD421', 'ZBRZD421-009', '2025-01-20', 980000, '2027-01-20', 'AVAILABLE', 'GOOD', '{"tipo":"Térmica Directa","ancho":"4 pulgadas","conectividad":"USB, Bluetooth"}', 'Para etiquetas de inventario'),
('a1a00010-0000-0000-0000-000000000001', _tid, 'Switch de Red Principal', 'NETWORK', 'Cisco', 'Catalyst 1300-24T', 'CSCSW24-010', '2024-03-01', 1800000, '2027-03-01', 'AVAILABLE', 'GOOD', '{"puertos":"24 GbE + 4 SFP","gestion":"Web UI + CLI"}', 'Switch core de la red local'),
('a1a00011-0000-0000-0000-000000000001', _tid, 'Tablet Inventario Bodega', 'TABLET', 'Samsung', 'Galaxy Tab A9+', 'SMGTA9-011', '2025-06-01', 1100000, '2027-06-01', 'ASSIGNED', 'NEW', '{"ram":"8GB","almacenamiento":"128GB","pantalla":"11 TFT LCD"}', 'Tablet para conteo físico en bodega'),
('a1a00012-0000-0000-0000-000000000001', _tid, 'PC Almacenista (Retirado)', 'DESKTOP', 'Dell', 'OptiPlex 5060', 'DLOPX5060-012', '2020-07-15', 2400000, '2023-07-15', 'RETIRED', 'POOR', '{"ram":"8GB","disco":"256GB SSD","procesador":"Intel i5-8500","so":"Windows 10 Pro"}', 'Equipo obsoleto - dado de baja 2025-12')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. IT ASSET ASSIGNMENTS — 9 asignaciones (8 activas, 1 histórica)
-- ============================================================
INSERT INTO it_asset_assignments (id, tenant_id, asset_id, employee_id, assigned_at, assigned_by, returned_at, return_condition, delivery_notes, return_notes) VALUES
('a2a00001-0000-0000-0000-000000000001', _tid, 'a1a00001-0000-0000-0000-000000000001', 'bc000005-0000-0000-0000-000000000001', '2024-06-20', _admin, NULL, NULL, 'Entregado con mouse y teclado inalámbrico', NULL),
('a2a00002-0000-0000-0000-000000000001', _tid, 'a1a00002-0000-0000-0000-000000000001', 'bc000006-0000-0000-0000-000000000001', '2025-01-15', _admin, NULL, NULL, 'Incluye maletín de transporte y cargador adicional', NULL),
('a2a00003-0000-0000-0000-000000000001', _tid, 'a1a00003-0000-0000-0000-000000000001', 'bc000007-0000-0000-0000-000000000001', '2025-03-25', _admin, NULL, NULL, 'Incluye Magic Keyboard y Magic Mouse', NULL),
('a2a00004-0000-0000-0000-000000000001', _tid, 'a1a00004-0000-0000-0000-000000000001', 'bc000004-0000-0000-0000-000000000001', '2023-11-10', _admin, NULL, NULL, 'Monitor adicional 24 incluido', NULL),
('a2a00005-0000-0000-0000-000000000001', _tid, 'a1a00005-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000001', '2025-03-01', _admin, NULL, NULL, 'Maletín protector y cargador vehicular', NULL),
('a2a00006-0000-0000-0000-000000000001', _tid, 'a1a00006-0000-0000-0000-000000000001', 'bc000003-0000-0000-0000-000000000001', '2025-04-05', _admin, NULL, NULL, 'Funda protectora y vidrio templado', NULL),
('a2a00007-0000-0000-0000-000000000001', _tid, 'a1a00007-0000-0000-0000-000000000001', 'bc000008-0000-0000-0000-000000000001', '2025-04-05', _admin, NULL, NULL, 'Funda protectora y vidrio templado', NULL),
('a2a00008-0000-0000-0000-000000000001', _tid, 'a1a00011-0000-0000-0000-000000000001', 'bc00000a-0000-0000-0000-000000000001', '2025-06-05', _admin, NULL, NULL, 'Con estuche rugged y lápiz stylus', NULL),
('a2a00009-0000-0000-0000-000000000001', _tid, 'a1a00012-0000-0000-0000-000000000001', 'bc000009-0000-0000-0000-000000000001', '2020-08-01', _admin, '2025-11-30', 'POOR', 'Equipo nuevo para almacén', 'Devuelto por obsolescencia - fallas frecuentes en disco duro')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. IT MAINTENANCE SCHEDULES — 8 programaciones
-- ============================================================
INSERT INTO it_maintenance_schedules (id, tenant_id, asset_id, maintenance_type, frequency_days, last_performed_at, next_due_at, performed_by, notes, status) VALUES
('a3a00001-0000-0000-0000-000000000001', _tid, 'a1a00001-0000-0000-0000-000000000001', 'PREVENTIVE', 180, '2025-12-15', '2026-06-14', 'TechSolutions SAS', 'Limpieza interna, actualización drivers, antivirus', 'SCHEDULED'),
('a3a00002-0000-0000-0000-000000000001', _tid, 'a1a00004-0000-0000-0000-000000000001', 'PREVENTIVE', 180, '2025-11-20', '2026-05-19', 'TechSolutions SAS', 'Limpieza, backup, optimización Windows', 'SCHEDULED'),
('a3a00003-0000-0000-0000-000000000001', _tid, 'a1a00008-0000-0000-0000-000000000001', 'CORRECTIVE', NULL, NULL, '2026-03-10', 'HP Service Colombia', 'Falla en bandeja de alimentación - repuesto en camino', 'SCHEDULED'),
('a3a00004-0000-0000-0000-000000000001', _tid, 'a1a00002-0000-0000-0000-000000000001', 'PREVENTIVE', 365, '2026-01-10', '2027-01-10', 'TechSolutions SAS', 'Revisión anual: batería, thermal paste, SSD health', 'COMPLETED'),
('a3a00005-0000-0000-0000-000000000001', _tid, 'a1a00005-0000-0000-0000-000000000001', 'PREVENTIVE', 365, NULL, '2026-03-01', 'TechSolutions SAS', 'Primera revisión programada', 'OVERDUE'),
('a3a00006-0000-0000-0000-000000000001', _tid, 'a1a00010-0000-0000-0000-000000000001', 'PREVENTIVE', 365, '2025-03-01', '2026-03-01', 'Cisco Partner Colombia', 'Actualización firmware + revisión configuración VLAN', 'OVERDUE'),
('a3a00007-0000-0000-0000-000000000001', _tid, 'a1a00009-0000-0000-0000-000000000001', 'PREVENTIVE', 180, '2025-07-20', '2026-01-16', 'Zebra Service', 'Limpieza cabezal térmico, calibración', 'OVERDUE'),
('a3a00008-0000-0000-0000-000000000001', _tid, 'a1a00003-0000-0000-0000-000000000001', 'PREVENTIVE', 365, '2026-02-20', '2027-02-20', 'iService Apple Premium Reseller', 'Revisión general, actualización macOS, limpieza', 'COMPLETED')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. PRODUCTION RECIPES — 3 recetas
-- ============================================================
INSERT INTO production_recipes (id, tenant_id, product_id, name, description, is_active) VALUES
('a4a00001-0000-0000-0000-000000000001', _tid, 'bb000001-0000-0000-0000-000000000001', 'Kit Vacunación Canina Básico', 'Kit pre-armado con vacuna rabia + jeringa + guantes para jornada de vacunación', true),
('a4a00002-0000-0000-0000-000000000001', _tid, 'bb000003-0000-0000-0000-000000000001', 'Kit Desparasitación Bovino', 'Kit para desparasitación de bovinos: ivermectina + jeringas + guantes', true),
('a4a00003-0000-0000-0000-000000000001', _tid, 'bb000011-0000-0000-0000-000000000001', 'Kit Hidratación Urgencia', 'Kit de hidratación IV: Ringer Lactato + catéter + equipo venoclisis', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. PRODUCTION RECIPE ITEMS
-- ============================================================
INSERT INTO production_recipe_items (id, recipe_id, product_id, qty_required, tenant_id) VALUES
('a5a00001-0000-0000-0000-000000000001', 'a4a00001-0000-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000001', 1, _tid),
('a5a00002-0000-0000-0000-000000000001', 'a4a00001-0000-0000-0000-000000000001', 'bb00000f-0000-0000-0000-000000000001', 1, _tid),
('a5a00003-0000-0000-0000-000000000001', 'a4a00001-0000-0000-0000-000000000001', 'bb000012-0000-0000-0000-000000000001', 1, _tid),
('a5a00004-0000-0000-0000-000000000001', 'a4a00002-0000-0000-0000-000000000001', 'bb000003-0000-0000-0000-000000000001', 1, _tid),
('a5a00005-0000-0000-0000-000000000001', 'a4a00002-0000-0000-0000-000000000001', 'bb00000f-0000-0000-0000-000000000001', 3, _tid),
('a5a00006-0000-0000-0000-000000000001', 'a4a00002-0000-0000-0000-000000000001', 'bb000012-0000-0000-0000-000000000001', 1, _tid),
('a5a00007-0000-0000-0000-000000000001', 'a4a00003-0000-0000-0000-000000000001', 'bb000011-0000-0000-0000-000000000001', 2, _tid),
('a5a00008-0000-0000-0000-000000000001', 'a4a00003-0000-0000-0000-000000000001', 'bb000010-0000-0000-0000-000000000001', 1, _tid),
('a5a00009-0000-0000-0000-000000000001', 'a4a00003-0000-0000-0000-000000000001', 'bb000012-0000-0000-0000-000000000001', 1, _tid)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. PRODUCTION ORDERS — 4 órdenes
-- ============================================================
INSERT INTO production_orders (id, tenant_id, recipe_id, order_number, qty_target, qty_produced, status, warehouse_id, notes, started_at, completed_at) VALUES
('a6a00001-0000-0000-0000-000000000001', _tid, 'a4a00001-0000-0000-0000-000000000001', 'OP-2026-0001', 50, 50, 'COMPLETED', 'b0000001-0000-0000-0000-000000000001', 'Jornada vacunación canina Alcaldía Bogotá', '2026-01-15 08:00:00-05', '2026-01-15 16:00:00-05'),
('a6a00002-0000-0000-0000-000000000001', _tid, 'a4a00002-0000-0000-0000-000000000001', 'OP-2026-0002', 30, 20, 'IN_PROGRESS', 'b0000001-0000-0000-0000-000000000001', 'Preparación kits para Agropecuaria El Trebol', '2026-03-01 07:00:00-05', NULL),
('a6a00003-0000-0000-0000-000000000001', _tid, 'a4a00003-0000-0000-0000-000000000001', 'OP-2026-0003', 20, 0, 'DRAFT', 'b0000002-0000-0000-0000-000000000001', 'Kits para Hospital Veterinario del Norte', NULL, NULL),
('a6a00004-0000-0000-0000-000000000001', _tid, 'a4a00001-0000-0000-0000-000000000001', 'OP-2026-0004', 100, 0, 'DRAFT', 'b0000001-0000-0000-0000-000000000001', 'Pedido masivo jornada vacunación Cundinamarca Q2', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. SUPPORT INTERACTIONS
-- ============================================================
INSERT INTO support_interactions (id, ticket_id, author_id, content, is_internal) VALUES
('a7a00001-0000-0000-0000-000000000001', 'fc000001-0000-0000-0000-000000000001', _admin, 'Estamos revisando su solicitud. Le informaremos en las próximas 24 horas.', false),
('a7a00002-0000-0000-0000-000000000001', 'fc000001-0000-0000-0000-000000000001', _admin, 'NOTA INTERNA: Verificar con almacén si el producto fue despachado correctamente.', true),
('a7a00003-0000-0000-0000-000000000001', 'fc000002-0000-0000-0000-000000000001', _admin, 'Hemos identificado el problema con la factura. Procederemos a emitir una nota crédito.', false),
('a7a00004-0000-0000-0000-000000000001', 'fc000003-0000-0000-0000-000000000001', _admin, 'Su devolución ha sido procesada. El crédito se verá reflejado en su próxima factura.', false),
('a7a00005-0000-0000-0000-000000000001', 'fc000004-0000-0000-0000-000000000001', _admin, 'Estamos escalando este caso al área técnica para revisión de calidad del producto.', false),
('a7a00006-0000-0000-0000-000000000001', 'fc000004-0000-0000-0000-000000000001', _admin, 'NOTA INTERNA: El laboratorio confirmó lote afectado. Contactar proveedor Zoetis.', true),
('a7a00007-0000-0000-0000-000000000001', 'fc000005-0000-0000-0000-000000000001', _admin, 'Hemos programado la entrega para mañana antes de las 2pm. Disculpe la demora.', false),
('a7a00008-0000-0000-0000-000000000001', 'fc000006-0000-0000-0000-000000000001', _admin, 'El certificado de calidad ha sido enviado a su correo electrónico.', false),
('a7a00009-0000-0000-0000-000000000001', 'fc000007-0000-0000-0000-000000000001', _admin, 'Confirmamos que el pago fue aplicado correctamente a su cuenta. El saldo actual es $0.', false),
('a7a0000a-0000-0000-0000-000000000001', 'fc000008-0000-0000-0000-000000000001', _admin, 'Hemos actualizado los datos de envío en su próximo pedido. Gracias por la actualización.', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. DEBTOR PROFILES
-- ============================================================
INSERT INTO debtor_profiles (id, tenant_id, party_id, risk_level, average_payment_days, last_action_at, notes, excluded) VALUES
('a8a00001-0000-0000-0000-000000000001', _tid, 'ab000001-0000-0000-0000-000000000001', 'LOW', 15, '2026-02-28', 'Cliente puntual, pago siempre antes de vencimiento', false),
('a8a00002-0000-0000-0000-000000000001', _tid, 'ab000005-0000-0000-0000-000000000001', 'LOW', 22, '2026-02-15', 'Pago regular, sin inconvenientes', false),
('a8a00003-0000-0000-0000-000000000001', _tid, 'ab000009-0000-0000-0000-000000000001', 'MEDIUM', 45, '2026-03-01', 'Pagos frecuentemente a 45 días. Requiere seguimiento', false),
('a8a00004-0000-0000-0000-000000000001', _tid, 'ab00000a-0000-0000-0000-000000000001', 'HIGH', 75, '2026-03-03', 'Facturas con más de 60 días. Enviada carta de cobro jurídico', false),
('a8a00005-0000-0000-0000-000000000001', _tid, 'ab00000c-0000-0000-0000-000000000001', 'MEDIUM', 38, '2026-02-20', 'Pago irregular pero responde a llamadas de cobro', false),
('a8a00006-0000-0000-0000-000000000001', _tid, 'ab000008-0000-0000-0000-000000000001', 'LOW', 30, '2026-01-30', 'Entidad pública, pago a 30 días calendario exactos', true),
('a8a00007-0000-0000-0000-000000000001', _tid, 'ab00000d-0000-0000-0000-000000000001', 'LOW', 20, '2026-02-25', 'Excelente historial de pago', false),
('a8a00008-0000-0000-0000-000000000001', _tid, 'ab00000f-0000-0000-0000-000000000001', 'HIGH', 90, '2026-03-04', 'Cartera morosa > 90 días. Gestión pre-jurídica iniciada', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. COLLECTION ACTIONS
-- ============================================================
INSERT INTO collection_actions (id, tenant_id, document_id, action_type, channel, status, metadata, executed_at) VALUES
('a9a00001-0000-0000-0000-000000000001', _tid, 'd000000a-0000-0000-0000-000000000001', 'REMINDER', 'EMAIL', 'COMPLETED', '{"subject":"Recordatorio de pago FV-2025-0010"}', '2026-02-01 10:00:00-05'),
('a9a00002-0000-0000-0000-000000000001', _tid, 'd000000a-0000-0000-0000-000000000001', 'CALL', 'PHONE', 'COMPLETED', '{"contacted":"Dra. María López","result":"Prometió pago para el 15 de febrero"}', '2026-02-05 14:30:00-05'),
('a9a00003-0000-0000-0000-000000000001', _tid, 'd000000a-0000-0000-0000-000000000001', 'ESCALATION', 'EMAIL', 'COMPLETED', '{"subject":"Segundo aviso - Factura vencida FV-2025-0010"}', '2026-02-20 09:00:00-05'),
('a9a00004-0000-0000-0000-000000000001', _tid, 'd000000c-0000-0000-0000-000000000001', 'REMINDER', 'EMAIL', 'COMPLETED', '{"subject":"Recordatorio de pago FV-2025-0012"}', '2026-01-25 11:00:00-05'),
('a9a00005-0000-0000-0000-000000000001', _tid, 'd000000c-0000-0000-0000-000000000001', 'CALL', 'PHONE', 'COMPLETED', '{"contacted":"Administrador finca","result":"Pago parcial programado"}', '2026-02-10 16:00:00-05'),
('a9a00006-0000-0000-0000-000000000001', _tid, 'd000000f-0000-0000-0000-000000000001', 'REMINDER', 'EMAIL', 'PENDING', '{"subject":"Aviso de cobro FV-2025-0015"}', '2026-03-05 08:00:00-05'),
('a9a00007-0000-0000-0000-000000000001', _tid, 'd000000f-0000-0000-0000-000000000001', 'LEGAL_NOTICE', 'MAIL', 'PENDING', '{"type":"Carta cobro pre-jurídico"}', '2026-03-05 10:00:00-05')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. COLLECTION AGENT CONFIG
-- ============================================================
INSERT INTO collection_agent_config (id, tenant_id, is_active, tone, grace_days, min_amount_threshold, auto_escalate_days, reminder_frequency_days, config_json) VALUES
('aaa00001-0000-0000-0000-000000000001', _tid, true, 'PROFESSIONAL', 5, 100000, 30, 7, '{"email_template":"standard","escalation_chain":["reminder","call","escalation","legal_notice"],"working_hours":{"start":"08:00","end":"17:00"},"exclude_weekends":true}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. CONTRACT AMENDMENTS
-- ============================================================
INSERT INTO contract_amendments (id, contract_id, amendment_number, description, effective_date, value_change, created_by) VALUES
('aba00001-0000-0000-0000-000000000001', 'c6000001-0000-0000-0000-000000000001', 1, 'Ampliación de alcance: incluir productos de línea felina', '2026-02-01', 5000000, _admin),
('aba00002-0000-0000-0000-000000000001', 'c6000002-0000-0000-0000-000000000001', 1, 'Extensión de plazo por 6 meses adicionales', '2026-03-01', 0, _admin),
('aba00003-0000-0000-0000-000000000001', 'c6000003-0000-0000-0000-000000000001', 1, 'Incremento del 8% por ajuste inflación anual IPC', '2026-01-15', 3200000, _admin),
('aba00004-0000-0000-0000-000000000001', 'c6000001-0000-0000-0000-000000000001', 2, 'Ajuste de frecuencia de despacho: de quincenal a semanal', '2026-03-01', 2000000, _admin)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. DOCUMENT ALLOCATIONS
-- ============================================================
INSERT INTO document_allocations (id, tenant_id, document_id, transaction_id, amount) VALUES
('aca00001-0000-0000-0000-000000000001', _tid, 'd0000002-0000-0000-0000-000000000001', 'db000001-0000-0000-0000-000000000001', 200000),
('aca00002-0000-0000-0000-000000000001', _tid, 'd0000008-0000-0000-0000-000000000001', 'db000001-0000-0000-0000-000000000001', 654900),
('aca00003-0000-0000-0000-000000000001', _tid, 'd0000005-0000-0000-0000-000000000001', 'db000001-0000-0000-0000-000000000001', 500000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 13. PAYMENT ALLOCATIONS
-- ============================================================
INSERT INTO payment_allocations (id, tenant_id, document_id, transaction_id, amount) VALUES
('ada00001-0000-0000-0000-000000000001', _tid, 'd0000002-0000-0000-0000-000000000001', 'db000001-0000-0000-0000-000000000001', 200000),
('ada00002-0000-0000-0000-000000000001', _tid, 'd000000e-0000-0000-0000-000000000001', 'db000001-0000-0000-0000-000000000001', 322450)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 14. PAYMENT REPORTS — Dispersiones de nómina
-- ============================================================
INSERT INTO payment_reports (id, tenant_id, document_id, party_id, amount, notes, status) VALUES
('aea00001-0000-0000-0000-000000000001', _tid, NULL, 'ac000001-0000-0000-0000-000000000001', 4000000, 'Nómina Febrero 2026 - Dr. Luis Fernando Gómez', 'COMPLETED'),
('aea00002-0000-0000-0000-000000000001', _tid, NULL, 'ac000002-0000-0000-0000-000000000001', 3500000, 'Nómina Febrero 2026 - Dra. Catalina Restrepo', 'COMPLETED'),
('aea00003-0000-0000-0000-000000000001', _tid, NULL, 'ac000003-0000-0000-0000-000000000001', 1800000, 'Nómina Febrero 2026 - Andrés Felipe Martínez', 'COMPLETED'),
('aea00004-0000-0000-0000-000000000001', _tid, NULL, 'ac000004-0000-0000-0000-000000000001', 2800000, 'Nómina Febrero 2026 - Sandra Milena Torres', 'COMPLETED'),
('aea00005-0000-0000-0000-000000000001', _tid, NULL, 'ac000005-0000-0000-0000-000000000001', 1500000, 'Nómina Febrero 2026 - Jhonatan David Ruiz', 'COMPLETED'),
('aea00006-0000-0000-0000-000000000001', _tid, NULL, 'ac000006-0000-0000-0000-000000000001', 6000000, 'Nómina Febrero 2026 - Carolina Vargas Mendez', 'COMPLETED'),
('aea00007-0000-0000-0000-000000000001', _tid, NULL, 'ac000007-0000-0000-0000-000000000001', 3200000, 'Nómina Febrero 2026 - Diego Alejandro Pinilla', 'COMPLETED'),
('aea00008-0000-0000-0000-000000000001', _tid, NULL, 'ac000001-0000-0000-0000-000000000001', 4000000, 'Nómina Marzo 2026 - Dr. Luis Fernando Gómez', 'PENDING'),
('aea00009-0000-0000-0000-000000000001', _tid, NULL, 'ac000002-0000-0000-0000-000000000001', 3500000, 'Nómina Marzo 2026 - Dra. Catalina Restrepo', 'PENDING'),
('aea0000a-0000-0000-0000-000000000001', _tid, NULL, 'ac000003-0000-0000-0000-000000000001', 1800000, 'Nómina Marzo 2026 - Andrés Felipe Martínez', 'PENDING')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 15. PARTY EXTERNAL IDS
-- ============================================================
INSERT INTO party_external_ids (id, tenant_id, party_id, source_system, source_table, source_id) VALUES
('afa00001-0000-0000-0000-000000000001', _tid, 'ab000001-0000-0000-0000-000000000001', 'SIIGO', 'terceros', 'TER-001234'),
('afa00002-0000-0000-0000-000000000001', _tid, 'ab000005-0000-0000-0000-000000000001', 'SIIGO', 'terceros', 'TER-005678'),
('afa00003-0000-0000-0000-000000000001', _tid, 'aa000001-0000-0000-0000-000000000001', 'SIIGO', 'terceros', 'TER-PRV-0001'),
('afa00004-0000-0000-0000-000000000001', _tid, 'ab000009-0000-0000-0000-000000000001', 'DIAN_RUT', 'rut', 'RUT-9003001231'),
('afa00005-0000-0000-0000-000000000001', _tid, 'ab00000a-0000-0000-0000-000000000001', 'DIAN_RUT', 'rut', 'RUT-9003112342'),
('afa00006-0000-0000-0000-000000000001', _tid, 'aa000002-0000-0000-0000-000000000001', 'WORLD_ANIMAL_HEALTH', 'providers', 'WAH-BAYER-COL')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 16. ADDITIONAL CHAT MESSAGES
-- ============================================================
INSERT INTO chat_messages (id, channel_id, sender_id, content, created_at)
SELECT msg.id, ch.id, _admin, msg.content, msg.ts
FROM chat_channels ch,
(VALUES
    ('b1a00001-0000-0000-0000-000000000001'::uuid, 'Buenos días equipo. Recordar que hoy llega el pedido de MSD Salud Animal. Por favor coordinar recepción en bodega.', '2026-03-04 08:15:00-05'::timestamptz),
    ('b1a00002-0000-0000-0000-000000000001'::uuid, 'El inventario de Ivermectina está bajo el punto de reorden. Alguien puede generar la OC?', '2026-03-04 09:30:00-05'::timestamptz),
    ('b1a00003-0000-0000-0000-000000000001'::uuid, 'Confirmado: la jornada de vacunación con la Alcaldía de Bogotá será el 15 de marzo. Necesitamos 200 kits.', '2026-03-04 11:00:00-05'::timestamptz),
    ('b1a00004-0000-0000-0000-000000000001'::uuid, 'Actualización: el portátil del Dr. Gómez ya fue entregado con su maletín de campo.', '2026-03-04 14:20:00-05'::timestamptz),
    ('b1a00005-0000-0000-0000-000000000001'::uuid, 'Reunión de cierre mensual mañana a las 9am. Traer reportes de ventas y cartera.', '2026-03-04 16:45:00-05'::timestamptz),
    ('b1a00006-0000-0000-0000-000000000001'::uuid, 'El certificado de calidad del lote MED-001-L003 ya fue validado por el INVIMA. Todo OK.', '2026-03-05 08:00:00-05'::timestamptz),
    ('b1a00007-0000-0000-0000-000000000001'::uuid, 'Recordatorio: las notas crédito pendientes de Granja Porcina El Refugio deben procesarse hoy.', '2026-03-05 09:15:00-05'::timestamptz)
) AS msg(id, content, ts)
WHERE ch.tenant_id = _tid
LIMIT 7
ON CONFLICT DO NOTHING;

-- ============================================================
-- 17. ADDITIONAL NOTIFICATIONS (correct schema: title, body, link, is_read, category, priority)
-- ============================================================
INSERT INTO app_notifications (id, tenant_id, user_id, title, body, link, is_read, category, priority, created_at) VALUES
('b2a00001-0000-0000-0000-000000000001', _tid, _admin, 'OC Aprobada', 'La orden de compra OC-2026-0001 ha sido aprobada para despacho.', '/purchasing/orders', false, 'PURCHASING', 'MEDIUM', '2026-03-05 08:30:00-05'),
('b2a00002-0000-0000-0000-000000000001', _tid, _admin, 'Factura Vencida', 'La factura FV-2025-0010 del Hospital Veterinario del Norte tiene 90+ días de mora.', '/sales/invoices', false, 'SALES', 'HIGH', '2026-03-05 09:00:00-05'),
('b2a00003-0000-0000-0000-000000000001', _tid, _admin, 'Mantenimiento Vencido', 'El switch de red Cisco Catalyst tiene mantenimiento preventivo vencido.', '/technology', false, 'SYSTEM', 'HIGH', '2026-03-05 09:15:00-05'),
('b2a00004-0000-0000-0000-000000000001', _tid, _admin, 'Nuevo Lead', 'Nuevo lead registrado: Clínica Veterinaria San Marcos.', '/crm', true, 'CRM', 'MEDIUM', '2026-03-04 14:00:00-05'),
('b2a00005-0000-0000-0000-000000000001', _tid, _admin, 'Lote Próximo a Vencer', '3 lotes de productos tienen vencimiento en los próximos 30 días.', '/inventory/lots', true, 'INVENTORY', 'HIGH', '2026-03-04 07:00:00-05'),
('b2a00006-0000-0000-0000-000000000001', _tid, _admin, 'Nómina Procesada', 'La nómina de Febrero 2026 ha sido calculada para 17 empleados.', '/payroll/summary?period=2026-02', true, 'PAYROLL', 'MEDIUM', '2026-03-01 17:00:00-05'),
('b2a00007-0000-0000-0000-000000000001', _tid, _admin, 'Backup Completado', 'Backup automático de base de datos completado sin errores.', NULL, true, 'SYSTEM', 'LOW', '2026-03-05 02:00:00-05'),
('b2a00008-0000-0000-0000-000000000001', _tid, _admin, 'Ticket Soporte Asignado', 'Se le asignó el ticket TK-2026-0008.', '/support', false, 'SUPPORT', 'MEDIUM', '2026-03-05 10:00:00-05'),
('b2a00009-0000-0000-0000-000000000001', _tid, _admin, 'Recepción OC Parcial', 'Se recibieron 15 de 20 unidades de la OC-2026-0001.', '/purchasing/orders', false, 'PURCHASING', 'HIGH', '2026-03-04 16:00:00-05'),
('b2a0000a-0000-0000-0000-000000000001', _tid, _admin, 'Certificado DIAN Emitido', 'El documento electrónico FV-2025-0001 fue firmado y enviado a la DIAN.', '/dian', true, 'ACCOUNTING', 'MEDIUM', '2026-03-02 11:30:00-05')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 18. ADDITIONAL AUDIT LOG
-- ============================================================
INSERT INTO audit_log (id, tenant_id, actor_user_id, entity, entity_id, action, payload, created_at) VALUES
('b3a00001-0000-0000-0000-000000000001', _tid, _admin, 'it_assets', 'a1a00001-0000-0000-0000-000000000001', 'CREATE', '{"name":"PC Escritorio Recepción","category":"DESKTOP"}', '2024-06-15 10:00:00-05'),
('b3a00002-0000-0000-0000-000000000001', _tid, _admin, 'it_asset_assignments', 'a2a00001-0000-0000-0000-000000000001', 'CREATE', '{"asset":"PC Escritorio Recepción","employee":"Jhonatan David Ruiz"}', '2024-06-20 09:00:00-05'),
('b3a00003-0000-0000-0000-000000000001', _tid, _admin, 'production_orders', 'a6a00001-0000-0000-0000-000000000001', 'CREATE', '{"order_number":"OP-2026-0001"}', '2026-01-15 08:00:00-05'),
('b3a00004-0000-0000-0000-000000000001', _tid, _admin, 'production_orders', 'a6a00001-0000-0000-0000-000000000001', 'UPDATE', '{"status":"COMPLETED","qty_produced":50}', '2026-01-15 16:00:00-05'),
('b3a00005-0000-0000-0000-000000000001', _tid, _admin, 'documents', 'd0000002-0000-0000-0000-000000000001', 'UPDATE', '{"action":"payment_allocation","amount":200000}', '2026-02-10 14:00:00-05'),
('b3a00006-0000-0000-0000-000000000001', _tid, _admin, 'collection_actions', 'a9a00001-0000-0000-0000-000000000001', 'CREATE', '{"type":"REMINDER","document":"FV-2025-0010"}', '2026-02-01 10:00:00-05'),
('b3a00007-0000-0000-0000-000000000001', _tid, _admin, 'employees', 'bc000006-0000-0000-0000-000000000001', 'UPDATE', '{"field":"salary","old":5500000,"new":6000000}', '2026-01-01 08:00:00-05'),
('b3a00008-0000-0000-0000-000000000001', _tid, _admin, 'contracts', 'c6000001-0000-0000-0000-000000000001', 'UPDATE', '{"amendment":1,"description":"Ampliación línea felina"}', '2026-02-01 10:30:00-05'),
('b3a00009-0000-0000-0000-000000000001', _tid, _admin, 'it_maintenance_schedules', 'a3a00004-0000-0000-0000-000000000001', 'UPDATE', '{"status":"COMPLETED"}', '2026-01-10 17:00:00-05'),
('b3a0000a-0000-0000-0000-000000000001', _tid, _admin, 'support_tickets', 'fc000001-0000-0000-0000-000000000001', 'UPDATE', '{"status":"IN_PROGRESS"}', '2026-03-04 08:30:00-05')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 19. ADDITIONAL TREASURY TRANSACTIONS
-- ============================================================
INSERT INTO treasury_transactions (id, tenant_id, account_id, party_id, amount, transaction_type, date, description, reference_number, is_reconciled) VALUES
('b4a00001-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001', 932000, 'RECEIPT', '2026-02-05', 'Pago total FV-2025-0001', 'TRF-2026-0201', true),
('b4a00002-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'ab000005-0000-0000-0000-000000000001', 1688560, 'RECEIPT', '2026-02-12', 'Pago total FV-2025-0005', 'TRF-2026-0212', true),
('b4a00003-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'ab000006-0000-0000-0000-000000000001', 2000000, 'RECEIPT', '2026-02-20', 'Abono FV-2025-0006', 'TRF-2026-0220', true),
('b4a00004-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'ab00000b-0000-0000-0000-000000000001', 448250, 'RECEIPT', '2026-02-28', 'Pago total FV-2025-0011', 'TRF-2026-0228', true),
('b4a00005-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', -8500000, 'PAYMENT', '2026-02-15', 'Pago OC vacunas MSD', 'EGR-2026-0215', true),
('b4a00006-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'aa000003-0000-0000-0000-000000000001', -4200000, 'PAYMENT', '2026-02-18', 'Pago OC alimentos Royal Canin', 'EGR-2026-0218', true),
('b4a00007-0000-0000-0000-000000000001', _tid, 'bd000002-0000-0000-0000-000000000001', 'aa000005-0000-0000-0000-000000000001', -3100000, 'PAYMENT', '2026-02-25', 'Pago OC Hills Pet Nutrition', 'EGR-2026-0225', false),
('b4a00008-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', NULL, -1200000, 'PAYMENT', '2026-03-01', 'Arriendo bodega principal Marzo 2026', 'EGR-2026-0301', false),
('b4a00009-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', NULL, -450000, 'PAYMENT', '2026-03-01', 'Servicios públicos Febrero 2026', 'EGR-2026-0302', false),
('b4a0000a-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', NULL, -180000, 'PAYMENT', '2026-03-02', 'Servicio internet y telefonía Marzo 2026', 'EGR-2026-0303', false),
('b4a0000b-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'ab000012-0000-0000-0000-000000000001', 1409620, 'RECEIPT', '2026-03-03', 'Pago total FV-2025-0018', 'TRF-2026-0303', false),
('b4a0000c-0000-0000-0000-000000000001', _tid, 'bd000001-0000-0000-0000-000000000001', 'ab000014-0000-0000-0000-000000000001', 1304000, 'RECEIPT', '2026-03-04', 'Pago total FV-2025-0020', 'TRF-2026-0304', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 20. ADDITIONAL JOURNAL ENTRIES (correct: number, entry_date, period)
-- ============================================================
INSERT INTO journal_entries (id, tenant_id, number, entry_date, description, period, status) VALUES
('b5a00001-0000-0000-0000-000000000001', _tid, 'AC-2026-0050', '2026-03-01', 'Provisión arriendo bodega Marzo 2026', '2026-03', 'POSTED'),
('b5a00002-0000-0000-0000-000000000001', _tid, 'AC-2026-0051', '2026-03-01', 'Provisión nómina Marzo 2026', '2026-03', 'POSTED'),
('b5a00003-0000-0000-0000-000000000001', _tid, 'AC-2026-0052', '2026-03-02', 'Depreciación activos fijos Marzo 2026', '2026-03', 'POSTED'),
('b5a00004-0000-0000-0000-000000000001', _tid, 'AC-2026-0053', '2026-03-03', 'Recaudo cartera clientes', '2026-03', 'POSTED'),
('b5a00005-0000-0000-0000-000000000001', _tid, 'AC-2026-0054', '2026-03-05', 'Ajuste por diferencia en cambio USD', '2026-03', 'DRAFT')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 21. ADDITIONAL INVENTORY MOVEMENTS (correct: type, qty, cost, occurred_at)
-- ============================================================
INSERT INTO inventory_movements (id, tenant_id, product_id, warehouse_id, type, qty, cost, occurred_at) VALUES
('b6a00001-0000-0000-0000-000000000001', _tid, 'bb000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'IN', 200, 18500, '2026-03-01 10:00:00-05'),
('b6a00002-0000-0000-0000-000000000001', _tid, 'bb000002-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'IN', 150, 32000, '2026-03-01 10:15:00-05'),
('b6a00003-0000-0000-0000-000000000001', _tid, 'bb000009-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001', 'IN', 80, 145000, '2026-03-02 09:00:00-05'),
('b6a00004-0000-0000-0000-000000000001', _tid, 'bb00000a-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001', 'IN', 50, 175000, '2026-03-02 09:15:00-05'),
('b6a00005-0000-0000-0000-000000000001', _tid, 'bb000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'OUT', -50, 18500, '2026-03-03 11:00:00-05'),
('b6a00006-0000-0000-0000-000000000001', _tid, 'bb000003-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'OUT', -20, 28000, '2026-03-03 14:30:00-05'),
('b6a00007-0000-0000-0000-000000000001', _tid, 'bb000009-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001', 'OUT', -15, 145000, '2026-03-04 08:00:00-05'),
('b6a00008-0000-0000-0000-000000000001', _tid, 'bb000012-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'OUT', -5, 8500, '2026-03-04 17:00:00-05'),
('b6a00009-0000-0000-0000-000000000001', _tid, 'bb00000b-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'OUT', -10, 85000, '2026-03-05 07:30:00-05'),
('b6a0000a-0000-0000-0000-000000000001', _tid, 'bb00000b-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000001', 'IN', 10, 85000, '2026-03-05 08:00:00-05')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 22. ADDITIONAL LEADS (correct: name, not contact_name)
-- ============================================================
INSERT INTO leads (id, tenant_id, name, company_name, email, phone, source, status, notes, assigned_to) VALUES
('b7a00001-0000-0000-0000-000000000001', _tid, 'Dr. Ricardo Monsalve', 'Clínica Veterinaria San Marcos', 'rmonsalve@sanmarcos.com', '3112345678', 'REFERRAL', 'NEW', 'Interesado en línea completa de vacunas caninas y felinas. Tiene 3 sedes en Bogotá.', _admin),
('b7a00002-0000-0000-0000-000000000001', _tid, 'Camila Restrepo', 'Finca Ganadera La Esperanza', 'crestrepo@laesperanza.co', '3156789012', 'WEBSITE', 'CONTACTED', 'Busca proveedor de desparasitantes para ganado bovino. 800 cabezas.', _admin),
('b7a00003-0000-0000-0000-000000000001', _tid, 'Ing. Mauricio Pardo', 'Avícola del Oriente SAS', 'mpardo@avicolaoriente.com', '3189012345', 'TRADE_SHOW', 'QUALIFIED', 'Conocido en ExpoVeterinaria. Necesita antibióticos y suplementos para aves. Volumen alto.', _admin),
('b7a00004-0000-0000-0000-000000000001', _tid, 'Laura Sánchez', 'Pet Shop Huellitas', 'laura@huellitas.com.co', '3201234567', 'SOCIAL_MEDIA', 'NEW', 'Tienda de mascotas en Medellín. Interesada en alimentos premium.', _admin),
('b7a00005-0000-0000-0000-000000000001', _tid, 'Dr. Hernán Mejía', 'Universidad Nacional - Facultad Veterinaria', 'hmejia@unal.edu.co', '3013456789', 'EMAIL', 'CONTACTED', 'Convenio académico para suministro de insumos de laboratorio y práctica.', _admin)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 23. ADDITIONAL CRM OPPORTUNITIES (correct: name, description)
-- ============================================================
INSERT INTO crm_opportunities (id, tenant_id, lead_id, name, description, value, stage, probability, expected_close_date, assigned_to) VALUES
('b8a00001-0000-0000-0000-000000000001', _tid, 'b7a00001-0000-0000-0000-000000000001', 'Contrato anual vacunas - Clínica San Marcos', 'Propuesta enviada para suministro anual de vacunas caninas y felinas', 45000000, 'PROPOSAL', 60, '2026-04-15', _admin),
('b8a00002-0000-0000-0000-000000000001', _tid, 'b7a00002-0000-0000-0000-000000000001', 'Desparasitación masiva - Finca La Esperanza', 'Negociación de precios por volumen. 800 cabezas x 2 ciclos/año', 12000000, 'NEGOTIATION', 75, '2026-03-20', _admin),
('b8a00003-0000-0000-0000-000000000001', _tid, 'b7a00003-0000-0000-0000-000000000001', 'Suministro avícola - Avícola del Oriente', 'Oportunidad grande. Requiere visita técnica para evaluar necesidades', 85000000, 'QUALIFICATION', 40, '2026-05-30', _admin),
('b8a00004-0000-0000-0000-000000000001', _tid, 'b7a00004-0000-0000-0000-000000000001', 'Distribución alimentos Medellín - Huellitas', 'Primer contacto. Evaluar viabilidad de distribución fuera de Bogotá', 8000000, 'DISCOVERY', 30, '2026-04-30', _admin),
('b8a00005-0000-0000-0000-000000000001', _tid, 'b7a00005-0000-0000-0000-000000000001', 'Convenio académico UNAL 2026', 'Convenio marco para 2 semestres. Incluye descuento institucional del 15%', 15000000, 'PROPOSAL', 50, '2026-06-01', _admin)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 24. ADDITIONAL DOCUMENTS — Cotizaciones, NC, ND, Facturas
-- ============================================================
INSERT INTO documents (id, tenant_id, doc_type, number, party_id, issue_date, due_date, currency, subtotal, taxes, total, status, balance, parent_id, notes_internal, notes_public) VALUES
('b9a00001-0000-0000-0000-000000000001', _tid, 'QUOTATION', 'COT-2026-0100', 'ab000009-0000-0000-0000-000000000001', '2026-03-01', '2026-03-15', 'COP', 8500000, 1615000, 10115000, 'DRAFT', 10115000, NULL, 'Cotización para jornada de desparasitación Q2', 'Precios válidos por 15 días'),
('b9a00002-0000-0000-0000-000000000001', _tid, 'QUOTATION', 'COT-2026-0101', 'ab00000a-0000-0000-0000-000000000001', '2026-03-03', '2026-03-17', 'COP', 15000000, 2850000, 17850000, 'ACCEPTED', 17850000, NULL, 'Propuesta suministro anual hospital', 'Descuento del 5% por volumen incluido'),
('b9a00003-0000-0000-0000-000000000001', _tid, 'QUOTATION', 'COT-2026-0102', 'ab000015-0000-0000-0000-000000000001', '2026-03-05', '2026-03-19', 'COP', 3200000, 608000, 3808000, 'DRAFT', 3808000, NULL, 'Cotización insumos quirúrgicos', NULL),
('b9a00004-0000-0000-0000-000000000001', _tid, 'CREDIT_NOTE', 'NC-2026-0100', 'ab000009-0000-0000-0000-000000000001', '2026-02-15', NULL, 'COP', 200000, 38000, 238000, 'ACCEPTED', 0, 'd0000009-0000-0000-0000-000000000001', 'NC por producto no conforme en FV-2025-0009', 'Devolución de 5 unidades de Ivermectina'),
('b9a00005-0000-0000-0000-000000000001', _tid, 'CREDIT_NOTE', 'NC-2026-0101', 'ab00000c-0000-0000-0000-000000000001', '2026-03-01', NULL, 'COP', 150000, 28500, 178500, 'ACCEPTED', 0, 'd000000c-0000-0000-0000-000000000001', 'NC por diferencia de precio en FV-2025-0012', 'Ajuste precio según acuerdo comercial'),
('b9a00006-0000-0000-0000-000000000001', _tid, 'DEBIT_NOTE', 'ND-2026-0001', 'ab000006-0000-0000-0000-000000000001', '2026-03-02', NULL, 'COP', 50000, 9500, 59500, 'ACCEPTED', 59500, 'd0000006-0000-0000-0000-000000000001', 'ND por intereses de mora en FV-2025-0006', 'Intereses mora 30 días al 1.5% mensual'),
('b9a00007-0000-0000-0000-000000000001', _tid, 'INVOICE', 'FV-2026-0001', 'ab000001-0000-0000-0000-000000000001', '2026-03-03', '2026-04-02', 'COP', 4500000, 855000, 5355000, 'ACCEPTED', 5355000, NULL, 'Factura marzo - VetSalud Express', NULL),
('b9a00008-0000-0000-0000-000000000001', _tid, 'INVOICE', 'FV-2026-0002', 'ab000009-0000-0000-0000-000000000001', '2026-03-04', '2026-04-03', 'COP', 7800000, 1482000, 9282000, 'ACCEPTED', 9282000, NULL, 'Factura marzo - Agropecuaria El Trebol', NULL),
('b9a00009-0000-0000-0000-000000000001', _tid, 'INVOICE', 'FV-2026-0003', 'ab00000d-0000-0000-0000-000000000001', '2026-03-05', '2026-04-04', 'COP', 2300000, 437000, 2737000, 'DRAFT', 2737000, NULL, 'Factura en borrador - VetSalud Express', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 25. DOCUMENT LINES
-- ============================================================
INSERT INTO document_lines (id, tenant_id, document_id, product_id, description, qty, unit_price, tax_config, line_total) VALUES
('baa00001-0000-0000-0000-000000000001', _tid, 'b9a00007-0000-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000001', 'Vacuna Rabia Canina 1ml (Nobivac)', 100, 25000, '{"rate":19}', 2500000),
('baa00002-0000-0000-0000-000000000001', _tid, 'b9a00007-0000-0000-0000-000000000001', 'bb000002-0000-0000-0000-000000000001', 'Vacuna Moquillo DHPPi', 50, 40000, '{"rate":19}', 2000000),
('baa00003-0000-0000-0000-000000000001', _tid, 'b9a00008-0000-0000-0000-000000000001', 'bb000003-0000-0000-0000-000000000001', 'Ivermectina 1% Inyectable 50ml', 100, 38000, '{"rate":19}', 3800000),
('baa00004-0000-0000-0000-000000000001', _tid, 'b9a00008-0000-0000-0000-000000000001', 'bb00000f-0000-0000-0000-000000000001', 'Jeringas 3ml c/aguja 21G x100', 20, 85000, '{"rate":19}', 1700000),
('baa00005-0000-0000-0000-000000000001', _tid, 'b9a00008-0000-0000-0000-000000000001', 'bb000012-0000-0000-0000-000000000001', 'Guantes Examen Nitrilo L x100', 20, 45000, '{"rate":19}', 900000),
('baa00006-0000-0000-0000-000000000001', _tid, 'b9a00008-0000-0000-0000-000000000001', 'bb000004-0000-0000-0000-000000000001', 'Amoxicilina 500mg Tabletas x14', 40, 35000, '{"rate":19}', 1400000),
('baa00007-0000-0000-0000-000000000001', _tid, 'b9a00002-0000-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000001', 'Vacuna Rabia Canina 1ml (Nobivac)', 200, 24000, '{"rate":19}', 4800000),
('baa00008-0000-0000-0000-000000000001', _tid, 'b9a00002-0000-0000-0000-000000000001', 'bb000002-0000-0000-0000-000000000001', 'Vacuna Moquillo DHPPi', 100, 38000, '{"rate":19}', 3800000),
('baa00009-0000-0000-0000-000000000001', _tid, 'b9a00002-0000-0000-0000-000000000001', 'bb000005-0000-0000-0000-000000000001', 'Meloxicam 15mg/ml Inyectable', 80, 42000, '{"rate":19}', 3360000),
('baa0000a-0000-0000-0000-000000000001', _tid, 'b9a00002-0000-0000-0000-000000000001', 'bb00000f-0000-0000-0000-000000000001', 'Jeringas 3ml c/aguja 21G x100', 30, 80000, '{"rate":19}', 2400000),
('baa0000b-0000-0000-0000-000000000001', _tid, 'b9a00002-0000-0000-0000-000000000001', 'bb000014-0000-0000-0000-000000000001', 'Collar Isabelino Plastico M', 40, 16000, '{"rate":19}', 640000),
('baa0000c-0000-0000-0000-000000000001', _tid, 'b9a00004-0000-0000-0000-000000000001', 'bb000003-0000-0000-0000-000000000001', 'Devolución Ivermectina 1%', 5, 40000, '{"rate":19}', 200000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 26. ADDITIONAL LOGISTICS SHIPMENTS (correct: order_id, warehouse_id, shipped_at, delivered_at)
-- ============================================================
INSERT INTO logistics_shipments (id, tenant_id, carrier_id, order_id, warehouse_id, tracking_number, status, shipped_at, delivered_at, notes) VALUES
('bba00001-0000-0000-0000-000000000001', _tid, 'ca000001-0000-0000-0000-000000000001', 'b9a00007-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'SRV-2026-030301', 'IN_TRANSIT', '2026-03-03 15:00:00-05', NULL, 'Despacho con cadena de frío'),
('bba00002-0000-0000-0000-000000000001', _tid, 'ca000002-0000-0000-0000-000000000001', 'b9a00008-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'ENV-2026-030401', 'PENDING', NULL, NULL, 'Transporte especial rural'),
('bba00003-0000-0000-0000-000000000001', _tid, 'ca000001-0000-0000-0000-000000000001', 'd0000013-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'SRV-2026-022801', 'DELIVERED', '2026-02-26 09:00:00-05', '2026-02-28 14:00:00-05', 'Entregado antes de tiempo')
ON CONFLICT DO NOTHING;

-- Shipment items (correct: qty_ordered, qty_shipped, no tenant_id)
INSERT INTO logistics_shipment_items (id, shipment_id, product_id, qty_ordered, qty_shipped) VALUES
('bca00001-0000-0000-0000-000000000001', 'bba00001-0000-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000001', 100, 100),
('bca00002-0000-0000-0000-000000000001', 'bba00001-0000-0000-0000-000000000001', 'bb000002-0000-0000-0000-000000000001', 50, 50),
('bca00003-0000-0000-0000-000000000001', 'bba00002-0000-0000-0000-000000000001', 'bb000003-0000-0000-0000-000000000001', 100, 0),
('bca00004-0000-0000-0000-000000000001', 'bba00002-0000-0000-0000-000000000001', 'bb00000f-0000-0000-0000-000000000001', 20, 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 27. ADDITIONAL PRODUCT LOTS
-- ============================================================
INSERT INTO product_lots (id, tenant_id, product_id, warehouse_id, lot_number, qty, cost, expiration_date, status, notes) VALUES
('bda00001-0000-0000-0000-000000000001', _tid, 'bb000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'MED001-L004', 200, 25000, '2027-06-30', 'ACTIVE', 'Lote recibido marzo 2026 - MSD'),
('bda00002-0000-0000-0000-000000000001', _tid, 'bb000002-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'MED002-L003', 150, 40000, '2027-08-15', 'ACTIVE', 'Lote recibido marzo 2026 - MSD'),
('bda00003-0000-0000-0000-000000000001', _tid, 'bb000003-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'MED003-L005', 80, 38000, '2026-04-10', 'ACTIVE', 'ALERTA: vence en aprox 35 dias'),
('bda00004-0000-0000-0000-000000000001', _tid, 'bb000004-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001', 'MED004-L002', 120, 35000, '2027-12-31', 'ACTIVE', 'Lote grande - Amoxicilina'),
('bda00005-0000-0000-0000-000000000001', _tid, 'bb000005-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'MED005-L003', 60, 42000, '2026-03-25', 'ACTIVE', 'URGENTE: vence en 20 dias'),
('bda00006-0000-0000-0000-000000000001', _tid, 'bb000006-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000001', 'MED006-L002', 45, 65000, '2026-11-30', 'ACTIVE', 'Tramadol - almacenar en area controlada'),
('bda00007-0000-0000-0000-000000000001', _tid, 'bb000008-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'MED008-L004', 90, 48000, '2027-03-15', 'ACTIVE', 'Frontline Spot-On')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 28. ADDITIONAL ABSENCE REQUESTS (correct: reason, days)
-- ============================================================
INSERT INTO absence_requests (id, tenant_id, employee_id, absence_type, start_date, end_date, days, reason, status, reviewed_by) VALUES
('bea00001-0000-0000-0000-000000000001', _tid, 'bc000001-0000-0000-0000-000000000001', 'VACATION', '2026-04-07', '2026-04-18', 10, 'Vacaciones Semana Santa + semana adicional', 'PENDING', NULL),
('bea00002-0000-0000-0000-000000000001', _tid, 'bc000003-0000-0000-0000-000000000001', 'SICK_LEAVE', '2026-03-03', '2026-03-04', 2, 'Incapacidad médica - gripa', 'APPROVED', _admin),
('bea00003-0000-0000-0000-000000000001', _tid, 'bc000007-0000-0000-0000-000000000001', 'PERSONAL', '2026-03-10', '2026-03-10', 1, 'Diligencia personal - medio día', 'APPROVED', _admin),
('bea00004-0000-0000-0000-000000000001', _tid, 'bc000004-0000-0000-0000-000000000001', 'VACATION', '2026-06-15', '2026-06-30', 12, 'Vacaciones programadas junio', 'PENDING', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 29. ADDITIONAL OVERTIME REQUESTS (correct: start_time, end_time, reason)
-- ============================================================
INSERT INTO overtime_requests (id, tenant_id, employee_id, date, start_time, end_time, hours, reason, status, reviewed_by) VALUES
('bfa00001-0000-0000-0000-000000000001', _tid, 'bc000001-0000-0000-0000-000000000001', '2026-03-01', '17:00', '20:00', 3, 'Atención urgencia veterinaria ganado - finca El Trebol', 'APPROVED', _admin),
('bfa00002-0000-0000-0000-000000000001', _tid, 'bc00000a-0000-0000-0000-000000000001', '2026-03-02', '17:00', '21:00', 4, 'Inventario físico trimestral bodega principal', 'APPROVED', _admin),
('bfa00003-0000-0000-0000-000000000001', _tid, 'bc000003-0000-0000-0000-000000000001', '2026-02-28', '18:00', '20:00', 2, 'Cierre de mes - preparación reportes ventas', 'APPROVED', _admin),
('bfa00004-0000-0000-0000-000000000001', _tid, 'bc000008-0000-0000-0000-000000000001', '2026-03-04', '17:00', '20:00', 3, 'Despacho urgente a Hospital Vet Norte', 'PENDING', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 30. ADDITIONAL TRAINING RECORDS (correct: scheduled_date, completion_date, certificate_number)
-- ============================================================
INSERT INTO training_records (id, tenant_id, program_id, employee_id, scheduled_date, status, score, completion_date, certificate_number, notes) VALUES
('c0a00001-0000-0000-0000-000000000001', _tid, 'd6000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000001', '2026-02-15', 'COMPLETED', 92, '2026-02-28', 'CERT-0010', 'Excelente desempeño en evaluación práctica'),
('c0a00002-0000-0000-0000-000000000001', _tid, 'd6000001-0000-0000-0000-000000000001', 'bc000004-0000-0000-0000-000000000001', '2026-02-15', 'COMPLETED', 88, '2026-02-28', 'CERT-0011', 'Aprobado con buen puntaje'),
('c0a00003-0000-0000-0000-000000000001', _tid, 'd6000001-0000-0000-0000-000000000001', 'bc000006-0000-0000-0000-000000000001', '2026-02-15', 'COMPLETED', 95, '2026-02-28', 'CERT-0012', 'Máximo puntaje del grupo'),
('c0a00004-0000-0000-0000-000000000001', _tid, 'd6000001-0000-0000-0000-000000000001', 'bc000003-0000-0000-0000-000000000001', '2026-03-10', 'SCHEDULED', NULL, NULL, NULL, 'En proceso - evaluacion pendiente'),
('c0a00005-0000-0000-0000-000000000001', _tid, 'd6000001-0000-0000-0000-000000000001', 'bc00000a-0000-0000-0000-000000000001', '2026-03-10', 'SCHEDULED', NULL, NULL, NULL, 'Asistio a 3 de 5 sesiones')
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Seed data inserted successfully for all modules';
END $$;
