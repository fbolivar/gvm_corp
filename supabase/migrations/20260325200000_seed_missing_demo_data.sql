-- ============================================================================
-- Seed missing demo data for presentation
-- This migration inserts demo data into tables that were empty
-- ============================================================================

DO $$
DECLARE
  v_tenant UUID := 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9';
  v_admin  UUID := '4d529f53-df07-434d-a7b6-d3e9b3f34634';
  v_wh     UUID;
  v_carrier UUID;
  v_doc1   UUID;
  v_doc2   UUID;
  v_doc3   UUID;
  v_doc4   UUID;
  v_doc5   UUID;
  v_acct   UUID;
  v_ship1  UUID;
  v_ship2  UUID;
  v_ship3  UUID;
  v_ship4  UUID;
  v_ship5  UUID;
  v_contract UUID;
  v_edoc   UUID;
  v_course1 UUID;
  v_course2 UUID;
  v_course3 UUID;
  v_lesson1 UUID;
  v_lesson2 UUID;
  v_lesson3 UUID;
  v_lesson4 UUID;
  v_lesson5 UUID;
  v_lesson6 UUID;
  v_budget UUID;
  v_stmt1  UUID;
  v_stmt2  UUID;
  v_prod1  UUID;
  v_prod2  UUID;
  v_prod3  UUID;
BEGIN

  -- Get references
  SELECT id INTO v_wh FROM warehouses WHERE tenant_id = v_tenant LIMIT 1;
  SELECT id INTO v_carrier FROM logistics_carriers WHERE tenant_id = v_tenant LIMIT 1;
  SELECT id INTO v_acct FROM treasury_accounts WHERE tenant_id = v_tenant LIMIT 1;

  SELECT id INTO v_doc1 FROM documents WHERE tenant_id = v_tenant AND doc_type = 'INVOICE' ORDER BY number LIMIT 1;
  SELECT id INTO v_doc2 FROM documents WHERE tenant_id = v_tenant AND doc_type = 'INVOICE' ORDER BY number OFFSET 1 LIMIT 1;
  SELECT id INTO v_doc3 FROM documents WHERE tenant_id = v_tenant AND doc_type = 'INVOICE' ORDER BY number OFFSET 2 LIMIT 1;
  SELECT id INTO v_doc4 FROM documents WHERE tenant_id = v_tenant AND doc_type = 'INVOICE' ORDER BY number OFFSET 3 LIMIT 1;
  SELECT id INTO v_doc5 FROM documents WHERE tenant_id = v_tenant AND doc_type = 'INVOICE' ORDER BY number OFFSET 4 LIMIT 1;

  SELECT id INTO v_prod1 FROM products WHERE tenant_id = v_tenant AND type = 'GOOD' ORDER BY sku LIMIT 1;
  SELECT id INTO v_prod2 FROM products WHERE tenant_id = v_tenant AND type = 'GOOD' ORDER BY sku OFFSET 1 LIMIT 1;
  SELECT id INTO v_prod3 FROM products WHERE tenant_id = v_tenant AND type = 'GOOD' ORDER BY sku OFFSET 2 LIMIT 1;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- LOGISTICS SHIPMENTS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM logistics_shipments WHERE tenant_id = v_tenant) AND v_doc1 IS NOT NULL THEN
    INSERT INTO logistics_shipments (id, tenant_id, order_id, carrier_id, warehouse_id, tracking_number, status, shipped_at, delivered_at, notes, freight_cost)
    VALUES
      (gen_random_uuid(), v_tenant, v_doc1, v_carrier, v_wh, 'GVM-SHIP-00001', 'ENTREGADO', now()-interval '20 days', now()-interval '17 days', 'Despacho Bogota - Medellin', 185000),
      (gen_random_uuid(), v_tenant, v_doc2, v_carrier, v_wh, 'GVM-SHIP-00002', 'ENTREGADO', now()-interval '15 days', now()-interval '13 days', 'Despacho Bogota - Cali', 220000),
      (gen_random_uuid(), v_tenant, v_doc3, v_carrier, v_wh, 'GVM-SHIP-00003', 'EN_TRANSITO', now()-interval '5 days', NULL, 'Despacho Bogota - Barranquilla', 350000),
      (gen_random_uuid(), v_tenant, v_doc4, v_carrier, v_wh, 'GVM-SHIP-00004', 'LISTO_DESPACHO', NULL, NULL, 'Pendiente despacho - Bucaramanga', 280000),
      (gen_random_uuid(), v_tenant, v_doc5, v_carrier, v_wh, 'GVM-SHIP-00005', 'EN_ALISTAMIENTO', NULL, NULL, 'En preparacion - Pereira', 195000);

    -- Get shipment IDs for items
    SELECT id INTO v_ship1 FROM logistics_shipments WHERE tenant_id = v_tenant AND tracking_number = 'GVM-SHIP-00001' LIMIT 1;
    SELECT id INTO v_ship2 FROM logistics_shipments WHERE tenant_id = v_tenant AND tracking_number = 'GVM-SHIP-00002' LIMIT 1;
    SELECT id INTO v_ship3 FROM logistics_shipments WHERE tenant_id = v_tenant AND tracking_number = 'GVM-SHIP-00003' LIMIT 1;
    SELECT id INTO v_ship4 FROM logistics_shipments WHERE tenant_id = v_tenant AND tracking_number = 'GVM-SHIP-00004' LIMIT 1;
    SELECT id INTO v_ship5 FROM logistics_shipments WHERE tenant_id = v_tenant AND tracking_number = 'GVM-SHIP-00005' LIMIT 1;

    -- LOGISTICS SHIPMENT ITEMS
    INSERT INTO logistics_shipment_items (shipment_id, product_id, qty_ordered, qty_shipped) VALUES
      (v_ship1, v_prod1, 50, 50),
      (v_ship1, v_prod2, 30, 30),
      (v_ship2, v_prod1, 25, 25),
      (v_ship2, v_prod3, 40, 40),
      (v_ship3, v_prod2, 60, 60),
      (v_ship3, v_prod3, 20, 20),
      (v_ship4, v_prod1, 100, 0),
      (v_ship4, v_prod2, 45, 0),
      (v_ship5, v_prod3, 80, 0);

    RAISE NOTICE 'OK: logistics_shipments + items';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CURRENCIES (if not exist)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
    ('COP', 'Peso Colombiano', '$', 0),
    ('USD', 'Dolar Estadounidense', 'US$', 2),
    ('EUR', 'Euro', '€', 2),
    ('BRL', 'Real Brasileno', 'R$', 2),
    ('MXN', 'Peso Mexicano', 'MX$', 2)
  ON CONFLICT (code) DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- BANK STATEMENTS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM bank_statements WHERE tenant_id = v_tenant) AND v_acct IS NOT NULL THEN
    INSERT INTO bank_statements (id, tenant_id, account_id, start_date, end_date, opening_balance, closing_balance, status, created_by)
    VALUES
      (gen_random_uuid(), v_tenant, v_acct, '2026-01-01', '2026-01-31', 150000000, 165000000, 'COMPLETED', v_admin),
      (gen_random_uuid(), v_tenant, v_acct, '2026-02-01', '2026-02-28', 165000000, 185000000, 'COMPLETED', v_admin),
      (gen_random_uuid(), v_tenant, v_acct, '2026-03-01', '2026-03-25', 185000000, 198000000, 'DRAFT', v_admin);

    SELECT id INTO v_stmt1 FROM bank_statements WHERE tenant_id = v_tenant AND start_date = '2026-02-01' LIMIT 1;
    SELECT id INTO v_stmt2 FROM bank_statements WHERE tenant_id = v_tenant AND start_date = '2026-03-01' LIMIT 1;

    -- BANK STATEMENT LINES
    IF v_stmt1 IS NOT NULL THEN
      INSERT INTO bank_statement_lines (tenant_id, statement_id, date, description, amount, status) VALUES
        (v_tenant, v_stmt1, '2026-02-05', 'Recaudo cliente VetRoble', 15000000, 'MATCHED'),
        (v_tenant, v_stmt1, '2026-02-10', 'Pago proveedor Zoetis', -25000000, 'MATCHED'),
        (v_tenant, v_stmt1, '2026-02-15', 'Recaudo factura AgroAndes', 8500000, 'MATCHED'),
        (v_tenant, v_stmt1, '2026-02-20', 'Pago nomina enero', -35000000, 'MATCHED'),
        (v_tenant, v_stmt1, '2026-02-25', 'Recaudo contrato trimestral', 45000000, 'MATCHED');
    END IF;
    IF v_stmt2 IS NOT NULL THEN
      INSERT INTO bank_statement_lines (tenant_id, statement_id, date, description, amount, status) VALUES
        (v_tenant, v_stmt2, '2026-03-03', 'Recaudo FV-2026-00001', 12000000, 'UNMATCHED'),
        (v_tenant, v_stmt2, '2026-03-08', 'Pago proveedor MSD Animal', -18000000, 'UNMATCHED'),
        (v_tenant, v_stmt2, '2026-03-12', 'Recaudo FV-2026-00005', 22000000, 'UNMATCHED'),
        (v_tenant, v_stmt2, '2026-03-18', 'Pago servicios publicos', -3500000, 'UNMATCHED'),
        (v_tenant, v_stmt2, '2026-03-22', 'Transferencia interna', 5000000, 'UNMATCHED');
    END IF;

    RAISE NOTICE 'OK: bank_statements + lines';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- ACADEMY COURSES + LESSONS + PROGRESS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM academy_courses WHERE tenant_id = v_tenant) THEN
    INSERT INTO academy_courses (id, tenant_id, title, description, module_key, slug, difficulty, estimated_minutes, is_published, sort_order, created_by)
    VALUES
      (gen_random_uuid(), v_tenant, 'Introduccion al ERP GVM', 'Aprende a navegar el sistema ERP completo', 'dashboard', 'intro-erp', 'BEGINNER', 60, true, 1, v_admin),
      (gen_random_uuid(), v_tenant, 'Gestion de Inventarios', 'Manejo de bodegas, lotes, seriales y ubicaciones', 'inventory', 'gestion-inventarios', 'INTERMEDIATE', 90, true, 2, v_admin),
      (gen_random_uuid(), v_tenant, 'Facturacion Electronica DIAN', 'CUFE, CUNE, transmision y eventos RADIAN', 'documents', 'facturacion-dian', 'ADVANCED', 120, true, 3, v_admin);

    SELECT id INTO v_course1 FROM academy_courses WHERE tenant_id = v_tenant AND slug = 'intro-erp';
    SELECT id INTO v_course2 FROM academy_courses WHERE tenant_id = v_tenant AND slug = 'gestion-inventarios';
    SELECT id INTO v_course3 FROM academy_courses WHERE tenant_id = v_tenant AND slug = 'facturacion-dian';

    -- Lessons for course 1
    INSERT INTO academy_lessons (id, tenant_id, course_id, title, content, sort_order, estimated_minutes)
    VALUES
      (gen_random_uuid(), v_tenant, v_course1, 'Navegacion del Dashboard', 'El dashboard muestra KPIs clave: ventas del mes, cuentas por cobrar, inventario y mas.', 1, 15),
      (gen_random_uuid(), v_tenant, v_course1, 'Modulos Principales', 'Ventas, Compras, Inventario, Contabilidad y RRHH son los modulos core del sistema.', 2, 20),
      (gen_random_uuid(), v_tenant, v_course1, 'Reportes y Exportacion', 'Todos los reportes se pueden exportar a Excel y PDF desde el boton de acciones.', 3, 25);

    -- Lessons for course 2
    INSERT INTO academy_lessons (id, tenant_id, course_id, title, content, sort_order, estimated_minutes)
    VALUES
      (gen_random_uuid(), v_tenant, v_course2, 'Gestion de Bodegas', 'Configure bodegas con ubicaciones por pasillo, estante y posicion.', 1, 20),
      (gen_random_uuid(), v_tenant, v_course2, 'Control de Lotes y Vencimientos', 'El sistema FEFO prioriza lotes por fecha de vencimiento automaticamente.', 2, 25),
      (gen_random_uuid(), v_tenant, v_course2, 'Seriales y Trazabilidad', 'Cada equipo tiene serial unico para rastreo completo del ciclo de vida.', 3, 20);

    -- Lessons for course 3
    INSERT INTO academy_lessons (id, tenant_id, course_id, title, content, sort_order, estimated_minutes)
    VALUES
      (gen_random_uuid(), v_tenant, v_course3, 'Configuracion DIAN', 'Configure software ID, PIN, clave tecnica y certificado digital.', 1, 30),
      (gen_random_uuid(), v_tenant, v_course3, 'Generacion CUFE y CUNE', 'El CUFE se genera con SHA-384 siguiendo el estandar DIAN UBL 2.1.', 2, 30),
      (gen_random_uuid(), v_tenant, v_course3, 'Transmision y Eventos RADIAN', 'Transmita facturas via SOAP y gestione eventos de aceptacion/rechazo.', 3, 30);

    -- Get lesson IDs for progress
    SELECT id INTO v_lesson1 FROM academy_lessons WHERE tenant_id = v_tenant AND course_id = v_course1 ORDER BY sort_order LIMIT 1;
    SELECT id INTO v_lesson2 FROM academy_lessons WHERE tenant_id = v_tenant AND course_id = v_course1 ORDER BY sort_order OFFSET 1 LIMIT 1;
    SELECT id INTO v_lesson3 FROM academy_lessons WHERE tenant_id = v_tenant AND course_id = v_course2 ORDER BY sort_order LIMIT 1;

    -- Progress for admin user
    INSERT INTO academy_progress (tenant_id, user_id, lesson_id, course_id, completed_at)
    VALUES
      (v_tenant, v_admin, v_lesson1, v_course1, now()-interval '10 days'),
      (v_tenant, v_admin, v_lesson2, v_course1, now()-interval '8 days'),
      (v_tenant, v_admin, v_lesson3, v_course2, now()-interval '5 days');

    RAISE NOTICE 'OK: academy_courses + lessons + progress';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CONTRACT AMENDMENTS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM contract_amendments) THEN
    SELECT id INTO v_contract FROM contracts WHERE tenant_id = v_tenant LIMIT 1;
    IF v_contract IS NOT NULL THEN
      INSERT INTO contract_amendments (contract_id, amendment_number, description, effective_date, value_change, created_by) VALUES
        (v_contract, 1, 'Incremento valor por inclusion de nuevos productos', '2026-02-15', 25000000, v_admin),
        (v_contract, 2, 'Extension plazo 6 meses adicionales', '2026-03-01', 0, v_admin);
      RAISE NOTICE 'OK: contract_amendments';
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- RADIAN EVENTS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM radian_events WHERE tenant_id = v_tenant) THEN
    SELECT id INTO v_edoc FROM electronic_documents WHERE tenant_id = v_tenant AND dian_status = 'ACCEPTED' LIMIT 1;
    IF v_edoc IS NOT NULL THEN
      INSERT INTO radian_events (tenant_id, electronic_document_id, event_code, event_description, response_code, response_message, status) VALUES
        (v_tenant, v_edoc, '030', 'Acuse de recibo', '200', 'Documento recibido exitosamente', 'ACCEPTED'),
        (v_tenant, v_edoc, '032', 'Recibo del bien o servicio', '200', 'Bien recibido conforme', 'ACCEPTED'),
        (v_tenant, v_edoc, '034', 'Aceptacion expresa', '200', 'Factura aceptada', 'ACCEPTED');
      RAISE NOTICE 'OK: radian_events';
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- PAYMENT LINKS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM payment_links WHERE tenant_id = v_tenant) AND v_doc1 IS NOT NULL THEN
    INSERT INTO payment_links (tenant_id, document_id, token, amount, currency, status, expires_at) VALUES
      (v_tenant, v_doc1, replace(gen_random_uuid()::text, '-', ''), 15000000, 'COP', 'PAID', now()+interval '30 days'),
      (v_tenant, v_doc2, replace(gen_random_uuid()::text, '-', ''), 8500000, 'COP', 'PENDING', now()+interval '30 days'),
      (v_tenant, v_doc3, replace(gen_random_uuid()::text, '-', ''), 22000000, 'COP', 'PENDING', now()+interval '15 days'),
      (v_tenant, v_doc4, replace(gen_random_uuid()::text, '-', ''), 5500000, 'COP', 'EXPIRED', now()-interval '5 days');
    RAISE NOTICE 'OK: payment_links';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- PRODUCT STOCK (materialized view / summary)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM product_stock WHERE tenant_id = v_tenant) THEN
    INSERT INTO product_stock (tenant_id, product_id, warehouse_id, qty, avg_cost)
    SELECT
      v_tenant,
      p.id,
      v_wh,
      floor(random() * 200 + 10)::numeric,
      floor(random() * 500000 + 10000)::numeric
    FROM products p
    WHERE p.tenant_id = v_tenant AND p.type = 'GOOD'
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'OK: product_stock';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- BUDGET LINES
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM budget_lines WHERE tenant_id = v_tenant) THEN
    SELECT id INTO v_budget FROM budgets WHERE tenant_id = v_tenant LIMIT 1;
    IF v_budget IS NOT NULL THEN
      INSERT INTO budget_lines (tenant_id, budget_id, category, subcategory, line_type, account_name, sort_order, m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12) VALUES
        (v_tenant, v_budget, 'INGRESOS', 'Ventas Medicamentos', 'INCOME', 'Ventas Medicamentos Veterinarios', 1, 80000000, 85000000, 90000000, 95000000, 100000000, 105000000, 110000000, 100000000, 95000000, 90000000, 85000000, 120000000),
        (v_tenant, v_budget, 'INGRESOS', 'Ventas Equipos', 'INCOME', 'Ventas Equipos y Dispositivos', 2, 20000000, 15000000, 25000000, 18000000, 22000000, 30000000, 28000000, 20000000, 15000000, 25000000, 20000000, 35000000),
        (v_tenant, v_budget, 'INGRESOS', 'Servicios', 'INCOME', 'Ingresos por Servicios Tecnicos', 3, 8000000, 8000000, 10000000, 12000000, 10000000, 8000000, 10000000, 12000000, 10000000, 8000000, 8000000, 15000000),
        (v_tenant, v_budget, 'GASTOS', 'Nomina', 'EXPENSE', 'Gastos de Personal', 4, 35000000, 35000000, 35000000, 35000000, 35000000, 35000000, 38000000, 38000000, 38000000, 38000000, 38000000, 38000000),
        (v_tenant, v_budget, 'GASTOS', 'Compras', 'EXPENSE', 'Costo de Mercancia', 5, 45000000, 48000000, 50000000, 52000000, 55000000, 58000000, 60000000, 55000000, 50000000, 48000000, 45000000, 65000000),
        (v_tenant, v_budget, 'GASTOS', 'Operacion', 'EXPENSE', 'Gastos Operativos', 6, 12000000, 12000000, 13000000, 12000000, 14000000, 13000000, 15000000, 14000000, 13000000, 12000000, 12000000, 18000000),
        (v_tenant, v_budget, 'GASTOS', 'Logistica', 'EXPENSE', 'Transporte y Distribucion', 7, 5000000, 5000000, 6000000, 5500000, 6000000, 7000000, 7000000, 6000000, 5500000, 5000000, 5000000, 8000000);
      RAISE NOTICE 'OK: budget_lines';
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- MORE CHAT MESSAGES + MEMBERS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF (SELECT count(*) FROM chat_messages) < 5 THEN
    DECLARE
      v_ch UUID;
      v_ch2 UUID;
    BEGIN
      SELECT id INTO v_ch FROM chat_channels WHERE tenant_id = v_tenant AND name = 'General' LIMIT 1;
      SELECT id INTO v_ch2 FROM chat_channels WHERE tenant_id = v_tenant AND name = 'Ventas' LIMIT 1;
      IF v_ch IS NOT NULL THEN
        INSERT INTO chat_messages (channel_id, sender_id, content, message_type) VALUES
          (v_ch, v_admin, 'Recordatorio: auditoria de calidad programada para el viernes', 'text'),
          (v_ch, v_admin, 'Los resultados de ventas del Q1 superaron la meta en 12%', 'text'),
          (v_ch, v_admin, 'Nuevo proveedor aprobado: BioVet Laboratorios', 'text'),
          (v_ch, v_admin, 'Se actualizo el procedimiento de despacho en cuarto frio', 'text'),
          (v_ch, v_admin, 'Felicitaciones al equipo de logistica por 0 incidentes este mes', 'text');
      END IF;
      IF v_ch2 IS NOT NULL THEN
        INSERT INTO chat_channel_members (channel_id, user_id, role) VALUES (v_ch2, v_admin, 'admin') ON CONFLICT DO NOTHING;
        INSERT INTO chat_messages (channel_id, sender_id, content, message_type) VALUES
          (v_ch2, v_admin, 'Oportunidad con Zoologico de Cali: 200M COP en pipeline', 'text'),
          (v_ch2, v_admin, 'Cotizacion aprobada para Centro Canino Bogota', 'text'),
          (v_ch2, v_admin, 'Meta de ventas marzo: 95M COP - vamos en 82M', 'text');
      END IF;
      RAISE NOTICE 'OK: chat_messages';
    END;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- MORE NOTIFICATIONS
  -- ═══════════════════════════════════════════════════════════════════════════
  IF (SELECT count(*) FROM app_notifications WHERE tenant_id = v_tenant) < 8 THEN
    INSERT INTO app_notifications (tenant_id, user_id, title, body, category, priority) VALUES
      (v_tenant, v_admin, 'Lote LOT-0003 proximo a vencer', 'El lote de Ivermectina vence en 15 dias', 'inventory', 'HIGH'),
      (v_tenant, v_admin, 'OC-2026-00008 recibida', 'Orden de compra de Zoetis recibida en bodega', 'purchasing', 'MEDIUM'),
      (v_tenant, v_admin, 'Stock bajo Amoxicilina', 'Producto por debajo del minimo: 5 unidades', 'inventory', 'HIGH'),
      (v_tenant, v_admin, 'FV-2026-00012 aceptada DIAN', 'Factura aceptada exitosamente por la DIAN', 'documents', 'LOW'),
      (v_tenant, v_admin, 'Mantenimiento preventivo programado', 'Compresor cuarto frio programado para manana', 'operations', 'HIGH'),
      (v_tenant, v_admin, 'Presupuesto logistica al 90%', 'Centro de costo Logistica supero el 90% del presupuesto', 'accounting', 'MEDIUM');
  END IF;

  RAISE NOTICE 'Seed de datos faltantes completado exitosamente';
END $$;
