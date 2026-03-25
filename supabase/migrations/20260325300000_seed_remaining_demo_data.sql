-- ============================================================================
-- Seed remaining demo data for ALL modules — presentation-ready
-- ============================================================================

DO $$
DECLARE
  v_tenant UUID := 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9';
  v_admin  UUID := '4d529f53-df07-434d-a7b6-d3e9b3f34634';
  v_emp1   UUID;
  v_emp2   UUID;
  v_emp3   UUID;
  v_emp4   UUID;
  v_emp5   UUID;
  v_ch1    UUID;
  v_ch2    UUID;
  v_course1 UUID;
  v_course2 UUID;
  v_course3 UUID;
  v_l1 UUID; v_l2 UUID; v_l3 UUID; v_l4 UUID; v_l5 UUID; v_l6 UUID;
  v_acct1  UUID;
  v_acct2  UUID;
  v_budget1 UUID;
  v_budget2 UUID;
  v_ca1 UUID; v_ca2 UUID; v_ca3 UUID; v_ca4 UUID; v_ca5 UUID;
  v_party1 UUID;
  v_party2 UUID;
  v_doc_inv1 UUID;
  v_doc_inv2 UUID;
  v_edoc1 UUID;
  v_edoc2 UUID;
  v_stmt1 UUID;
BEGIN

  -- Get employee IDs
  SELECT id INTO v_emp1 FROM employees WHERE tenant_id = v_tenant ORDER BY salary DESC LIMIT 1;
  SELECT id INTO v_emp2 FROM employees WHERE tenant_id = v_tenant ORDER BY salary DESC OFFSET 1 LIMIT 1;
  SELECT id INTO v_emp3 FROM employees WHERE tenant_id = v_tenant ORDER BY salary DESC OFFSET 2 LIMIT 1;
  SELECT id INTO v_emp4 FROM employees WHERE tenant_id = v_tenant ORDER BY salary DESC OFFSET 3 LIMIT 1;
  SELECT id INTO v_emp5 FROM employees WHERE tenant_id = v_tenant ORDER BY salary DESC OFFSET 4 LIMIT 1;

  -- Get chat channels
  SELECT id INTO v_ch1 FROM chat_channels WHERE tenant_id = v_tenant AND name = 'General' LIMIT 1;
  SELECT id INTO v_ch2 FROM chat_channels WHERE tenant_id = v_tenant AND name = 'Ventas' LIMIT 1;

  -- Get treasury accounts
  SELECT id INTO v_acct1 FROM treasury_accounts WHERE tenant_id = v_tenant LIMIT 1;
  SELECT id INTO v_acct2 FROM treasury_accounts WHERE tenant_id = v_tenant OFFSET 1 LIMIT 1;

  -- Get chart accounts
  SELECT id INTO v_ca1 FROM chart_accounts WHERE tenant_id = v_tenant AND code = '1105' LIMIT 1;
  SELECT id INTO v_ca2 FROM chart_accounts WHERE tenant_id = v_tenant AND code = '4135' LIMIT 1;
  SELECT id INTO v_ca3 FROM chart_accounts WHERE tenant_id = v_tenant AND code = '5105' LIMIT 1;
  SELECT id INTO v_ca4 FROM chart_accounts WHERE tenant_id = v_tenant AND code = '2205' LIMIT 1;
  SELECT id INTO v_ca5 FROM chart_accounts WHERE tenant_id = v_tenant AND code = '1110' LIMIT 1;

  -- Get parties
  SELECT id INTO v_party1 FROM parties WHERE tenant_id = v_tenant AND is_customer = true LIMIT 1;
  SELECT id INTO v_party2 FROM parties WHERE tenant_id = v_tenant AND is_vendor = true LIMIT 1;

  -- Get documents for electronic docs
  SELECT id INTO v_doc_inv1 FROM documents WHERE tenant_id = v_tenant AND doc_type = 'INVOICE' LIMIT 1;
  SELECT id INTO v_doc_inv2 FROM documents WHERE tenant_id = v_tenant AND doc_type = 'INVOICE' OFFSET 1 LIMIT 1;

  -- Get electronic documents for radian
  SELECT id INTO v_edoc1 FROM electronic_documents WHERE tenant_id = v_tenant LIMIT 1;
  SELECT id INTO v_edoc2 FROM electronic_documents WHERE tenant_id = v_tenant OFFSET 1 LIMIT 1;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 1. PAYROLL PERIODS (nómina electrónica needs this)
  -- ═══════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM payroll_periods WHERE tenant_id = v_tenant) THEN
    INSERT INTO payroll_periods (tenant_id, name, start_date, end_date, status) VALUES
      (v_tenant, 'Enero 2026', '2026-01-01', '2026-01-31', 'CLOSED'),
      (v_tenant, 'Febrero 2026', '2026-02-01', '2026-02-28', 'CLOSED'),
      (v_tenant, 'Marzo 2026 - 1ra Quincena', '2026-03-01', '2026-03-15', 'CLOSED'),
      (v_tenant, 'Marzo 2026 - 2da Quincena', '2026-03-16', '2026-03-31', 'OPEN');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 2. PAYROLL LOANS (préstamos empleados)
  -- ═══════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM payroll_loans WHERE tenant_id = v_tenant) THEN
    INSERT INTO payroll_loans (tenant_id, employee_id, amount_total, amount_paid, installment_count, installments_paid, installment_amount, interest_rate, start_date, description, status) VALUES
      (v_tenant, v_emp1, 5000000, 2000000, 10, 4, 500000, 0, '2025-11-01', 'Préstamo calamidad doméstica', 'ACTIVE'),
      (v_tenant, v_emp3, 3000000, 1500000, 6, 3, 500000, 0, '2025-12-01', 'Anticipo de vacaciones', 'ACTIVE'),
      (v_tenant, v_emp5, 2000000, 2000000, 4, 4, 500000, 0, '2025-09-01', 'Préstamo educativo', 'PAID'),
      (v_tenant, v_emp2, 8000000, 1600000, 10, 2, 800000, 1.5, '2026-01-01', 'Préstamo vivienda', 'ACTIVE'),
      (v_tenant, v_emp4, 1500000, 0, 3, 0, 500000, 0, '2026-03-15', 'Anticipo de nómina', 'ACTIVE');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 3. CHAT CHANNEL MEMBERS + MESSAGES
  -- ═══════════════════════════════════════════════════════════════════════
  IF v_ch1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id = v_ch1 AND user_id = v_admin) THEN
    INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at) VALUES
      (v_ch1, v_admin, 'admin', NOW() - INTERVAL '30 days');
  END IF;
  IF v_ch2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id = v_ch2 AND user_id = v_admin) THEN
    INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at) VALUES
      (v_ch2, v_admin, 'admin', NOW() - INTERVAL '25 days');
  END IF;

  IF v_ch1 IS NOT NULL AND (SELECT count(*) FROM chat_messages WHERE channel_id = v_ch1) < 5 THEN
    INSERT INTO chat_messages (channel_id, sender_id, content, message_type) VALUES
      (v_ch1, v_admin, 'Buenos días equipo, recuerden la reunión de ventas a las 9am', 'text'),
      (v_ch1, v_admin, 'Se aprobó el presupuesto para la campaña de vacunación Q2', 'text'),
      (v_ch1, v_admin, 'Favor revisar el inventario del cuarto frío, hay lotes próximos a vencer', 'text'),
      (v_ch1, v_admin, 'Excelente trabajo con la entrega al Zoológico de Cali, cliente muy satisfecho', 'text'),
      (v_ch1, v_admin, 'Recordatorio: capacitación BPA este viernes 8am en sala de juntas', 'text');
  END IF;

  IF v_ch2 IS NOT NULL AND (SELECT count(*) FROM chat_messages WHERE channel_id = v_ch2) < 3 THEN
    INSERT INTO chat_messages (channel_id, sender_id, content, message_type) VALUES
      (v_ch2, v_admin, 'Cerramos la oportunidad con Clínica VetRoble — $120M anuales', 'text'),
      (v_ch2, v_admin, 'Nuevo lead: Dr. Roberto Méndez de VetPlus Bucaramanga, interesado en equipos', 'text'),
      (v_ch2, v_admin, 'Meta del mes: 85% cumplida. Faltan 2 cotizaciones por cerrar', 'text');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 4. ACADEMY COURSES + LESSONS + PROGRESS (si vacíos o pocos)
  -- ═══════════════════════════════════════════════════════════════════════
  IF (SELECT count(*) FROM academy_courses WHERE tenant_id = v_tenant) < 3 THEN
    DELETE FROM academy_progress WHERE tenant_id = v_tenant;
    DELETE FROM academy_lessons WHERE tenant_id = v_tenant;
    DELETE FROM academy_courses WHERE tenant_id = v_tenant;

    INSERT INTO academy_courses (id, tenant_id, title, description, module_key, slug, difficulty, estimated_minutes, is_published, sort_order, created_by) VALUES
      (gen_random_uuid(), v_tenant, 'Introducción al Sistema ERP GVM', 'Aprende a navegar el sistema, módulos principales y funciones básicas', 'dashboard', 'intro-erp', 'beginner', 45, true, 1, v_admin),
      (gen_random_uuid(), v_tenant, 'Gestión de Inventario y Lotes', 'Control de stock, trazabilidad de lotes, FEFO y alertas de vencimiento', 'inventory', 'gestion-inventario', 'intermediate', 60, true, 2, v_admin),
      (gen_random_uuid(), v_tenant, 'Facturación Electrónica DIAN', 'Configuración DIAN, emisión de facturas, notas crédito y transmisión', 'documents', 'facturacion-dian', 'advanced', 90, true, 3, v_admin);

    SELECT id INTO v_course1 FROM academy_courses WHERE tenant_id = v_tenant AND slug = 'intro-erp';
    SELECT id INTO v_course2 FROM academy_courses WHERE tenant_id = v_tenant AND slug = 'gestion-inventario';
    SELECT id INTO v_course3 FROM academy_courses WHERE tenant_id = v_tenant AND slug = 'facturacion-dian';

    INSERT INTO academy_lessons (id, tenant_id, course_id, title, content, sort_order, estimated_minutes) VALUES
      (gen_random_uuid(), v_tenant, v_course1, 'Navegación del Dashboard', 'El dashboard es tu centro de control. Aquí encontrarás KPIs de ventas, inventario, cartera y nómina...', 1, 10),
      (gen_random_uuid(), v_tenant, v_course1, 'Gestión de Terceros', 'Los terceros (clientes y proveedores) son la base del sistema. Aprende a crearlos y editarlos...', 2, 15),
      (gen_random_uuid(), v_tenant, v_course1, 'Módulo de Ventas', 'Desde cotizaciones hasta facturas: el flujo completo de ventas en GVM...', 3, 20),
      (gen_random_uuid(), v_tenant, v_course2, 'Control de Stock por Bodega', 'Cada bodega maneja su propio inventario. Aprende a consultar existencias y movimientos...', 1, 15),
      (gen_random_uuid(), v_tenant, v_course2, 'Trazabilidad de Lotes FEFO', 'En productos veterinarios, el control de lotes y vencimientos es crítico...', 2, 20),
      (gen_random_uuid(), v_tenant, v_course2, 'Traslados entre Bodegas', 'Cómo mover mercancía entre sedes manteniendo la trazabilidad...', 3, 15),
      (gen_random_uuid(), v_tenant, v_course3, 'Configuración DIAN', 'Registro del software, certificado digital y resolución de numeración...', 1, 25),
      (gen_random_uuid(), v_tenant, v_course3, 'Emisión de Factura Electrónica', 'Paso a paso para emitir una factura con CUFE válido...', 2, 30),
      (gen_random_uuid(), v_tenant, v_course3, 'Notas Crédito y Débito', 'Cuándo y cómo emitir notas crédito y débito electrónicas...', 3, 20);

    -- Progress: admin completó intro, está en inventario
    v_l1 := (SELECT id FROM academy_lessons WHERE course_id = v_course1 ORDER BY sort_order LIMIT 1);
    v_l2 := (SELECT id FROM academy_lessons WHERE course_id = v_course1 ORDER BY sort_order OFFSET 1 LIMIT 1);
    v_l3 := (SELECT id FROM academy_lessons WHERE course_id = v_course1 ORDER BY sort_order OFFSET 2 LIMIT 1);
    v_l4 := (SELECT id FROM academy_lessons WHERE course_id = v_course2 ORDER BY sort_order LIMIT 1);
    v_l5 := (SELECT id FROM academy_lessons WHERE course_id = v_course2 ORDER BY sort_order OFFSET 1 LIMIT 1);

    INSERT INTO academy_progress (tenant_id, user_id, lesson_id, course_id, completed_at) VALUES
      (v_tenant, v_admin, v_l1, v_course1, NOW() - INTERVAL '10 days'),
      (v_tenant, v_admin, v_l2, v_course1, NOW() - INTERVAL '8 days'),
      (v_tenant, v_admin, v_l3, v_course1, NOW() - INTERVAL '5 days'),
      (v_tenant, v_admin, v_l4, v_course2, NOW() - INTERVAL '3 days'),
      (v_tenant, v_admin, v_l5, v_course2, NOW() - INTERVAL '1 day');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 5. BUDGET LINES (for existing budgets)
  -- ═══════════════════════════════════════════════════════════════════════
  SELECT id INTO v_budget1 FROM budgets WHERE tenant_id = v_tenant LIMIT 1;
  SELECT id INTO v_budget2 FROM budgets WHERE tenant_id = v_tenant OFFSET 1 LIMIT 1;

  IF v_budget1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM budget_lines WHERE budget_id = v_budget1) THEN
    INSERT INTO budget_lines (tenant_id, budget_id, category, subcategory, line_type, amount, account_name, sort_order,
      m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12) VALUES
      (v_tenant, v_budget1, 'VENTAS', 'Productos veterinarios', 'INCOME', 1200000000, 'Ventas mercancía', 1,
        85000000, 90000000, 95000000, 100000000, 105000000, 110000000, 100000000, 95000000, 90000000, 100000000, 110000000, 120000000),
      (v_tenant, v_budget1, 'VENTAS', 'Servicios técnicos', 'INCOME', 180000000, 'Ingresos servicios', 2,
        12000000, 13000000, 14000000, 15000000, 16000000, 17000000, 16000000, 15000000, 14000000, 15000000, 16000000, 17000000),
      (v_tenant, v_budget1, 'COSTOS', 'Costo mercancía', 'EXPENSE', 720000000, 'CMV', 3,
        55000000, 58000000, 60000000, 62000000, 63000000, 65000000, 60000000, 58000000, 55000000, 60000000, 62000000, 62000000),
      (v_tenant, v_budget1, 'GASTOS', 'Personal', 'EXPENSE', 420000000, 'Gastos nómina', 4,
        35000000, 35000000, 35000000, 35000000, 35000000, 35000000, 35000000, 35000000, 35000000, 35000000, 35000000, 35000000),
      (v_tenant, v_budget1, 'GASTOS', 'Arriendo y servicios', 'EXPENSE', 96000000, 'Gastos operativos', 5,
        8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000),
      (v_tenant, v_budget1, 'GASTOS', 'Logística y transporte', 'EXPENSE', 60000000, 'Gastos logística', 6,
        4500000, 4800000, 5000000, 5200000, 5500000, 5500000, 5000000, 4800000, 4500000, 5000000, 5200000, 5000000);
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 6. BANK STATEMENTS + LINES (conciliación bancaria)
  -- ═══════════════════════════════════════════════════════════════════════
  IF v_acct1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bank_statements WHERE tenant_id = v_tenant AND account_id = v_acct1) THEN
    INSERT INTO bank_statements (id, tenant_id, account_id, start_date, end_date, opening_balance, closing_balance, status, created_by) VALUES
      (gen_random_uuid(), v_tenant, v_acct1, '2026-02-01', '2026-02-28', 165000000, 185000000, 'RECONCILED', v_admin),
      (gen_random_uuid(), v_tenant, v_acct1, '2026-03-01', '2026-03-25', 185000000, 198500000, 'PENDING', v_admin);

    v_stmt1 := (SELECT id FROM bank_statements WHERE tenant_id = v_tenant AND start_date = '2026-03-01' LIMIT 1);
    IF v_stmt1 IS NOT NULL THEN
      INSERT INTO bank_statement_lines (statement_id, tenant_id, date, description, amount, status) VALUES
        (v_stmt1, v_tenant, '2026-03-02', 'Recaudo factura FV-2026-00001 — Clínica VetRoble', 18500000, 'MATCHED'),
        (v_stmt1, v_tenant, '2026-03-05', 'Pago nómina febrero 2026', -35000000, 'MATCHED'),
        (v_stmt1, v_tenant, '2026-03-08', 'Pago proveedor Zoetis OC-2026-00003', -22000000, 'MATCHED'),
        (v_stmt1, v_tenant, '2026-03-10', 'Recaudo factura FV-2026-00005 — AgroAndes', 12500000, 'MATCHED'),
        (v_stmt1, v_tenant, '2026-03-12', 'Transferencia recibida — Contrato ZooCali', 45000000, 'MATCHED'),
        (v_stmt1, v_tenant, '2026-03-14', 'Pago arriendo bodega Medellín', -4200000, 'PENDING'),
        (v_stmt1, v_tenant, '2026-03-16', 'Comisión bancaria mensual', -85000, 'PENDING'),
        (v_stmt1, v_tenant, '2026-03-18', 'Recaudo portal pagos — PetShop', 8200000, 'PENDING'),
        (v_stmt1, v_tenant, '2026-03-20', 'Pago servicios públicos', -2800000, 'PENDING'),
        (v_stmt1, v_tenant, '2026-03-22', 'Recaudo cartera vencida — Hacienda Bonanza', 13885000, 'PENDING');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 7. TREASURY TRANSACTIONS (si vacía — con nombre correcto de columnas)
  -- ═══════════════════════════════════════════════════════════════════════
  IF v_acct1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM treasury_transactions WHERE tenant_id = v_tenant LIMIT 1) THEN
    INSERT INTO treasury_transactions (tenant_id, account_id, party_id, amount, transaction_type, date, description, reference_number) VALUES
      (v_tenant, v_acct1, v_party1, 18500000, 'INCOME', '2026-03-02', 'Recaudo factura FV-2026-00001', 'REF-30001'),
      (v_tenant, v_acct1, NULL, -35000000, 'EXPENSE', '2026-03-05', 'Pago nómina febrero 2026', 'REF-30002'),
      (v_tenant, v_acct1, v_party2, -22000000, 'EXPENSE', '2026-03-08', 'Pago proveedor OC-2026-00003', 'REF-30003'),
      (v_tenant, v_acct1, v_party1, 12500000, 'INCOME', '2026-03-10', 'Recaudo factura FV-2026-00005', 'REF-30004'),
      (v_tenant, v_acct1, v_party1, 45000000, 'INCOME', '2026-03-12', 'Contrato anual ZooCali', 'REF-30005'),
      (v_tenant, v_acct1, NULL, -4200000, 'EXPENSE', '2026-03-14', 'Pago arriendo bodega Medellín', 'REF-30006'),
      (v_tenant, v_acct2, v_party1, 8200000, 'INCOME', '2026-03-18', 'Recaudo portal pagos', 'REF-30007'),
      (v_tenant, v_acct1, NULL, -2800000, 'EXPENSE', '2026-03-20', 'Pago servicios públicos', 'REF-30008'),
      (v_tenant, v_acct1, v_party1, 13885000, 'INCOME', '2026-03-22', 'Recaudo cartera vencida', 'REF-30009'),
      (v_tenant, v_acct2, v_party2, -15000000, 'EXPENSE', '2026-03-01', 'Compra insumos laboratorio', 'REF-30010');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 8. RADIAN EVENTS (eventos DIAN sobre documentos electrónicos)
  -- ═══════════════════════════════════════════════════════════════════════
  IF v_edoc1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM radian_events WHERE tenant_id = v_tenant AND electronic_document_id = v_edoc1) THEN
    INSERT INTO radian_events (tenant_id, electronic_document_id, event_code, event_description, response_code, response_message, status, sent_at, responded_at) VALUES
      (v_tenant, v_edoc1, '030', 'Acuse de recibo', '200', 'Evento registrado exitosamente', 'ACCEPTED', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
      (v_tenant, v_edoc1, '032', 'Recibo del bien o servicio', '200', 'Evento registrado exitosamente', 'ACCEPTED', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
      (v_tenant, v_edoc1, '034', 'Aceptación expresa', '200', 'Evento registrado exitosamente', 'ACCEPTED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days');
  END IF;

  IF v_edoc2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM radian_events WHERE tenant_id = v_tenant AND electronic_document_id = v_edoc2) THEN
    INSERT INTO radian_events (tenant_id, electronic_document_id, event_code, event_description, response_code, response_message, status, sent_at) VALUES
      (v_tenant, v_edoc2, '030', 'Acuse de recibo', '200', 'Evento registrado', 'ACCEPTED', NOW() - INTERVAL '8 days'),
      (v_tenant, v_edoc2, '031', 'Reclamo', NULL, NULL, 'PENDING', NOW() - INTERVAL '5 days');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 9. CONTRACT AMENDMENTS
  -- ═══════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM contract_amendments LIMIT 1) THEN
    INSERT INTO contract_amendments (contract_id, amendment_number, description, effective_date, value_change, created_by)
    SELECT c.id, 1, 'Ajuste por IPC 2026 — incremento 5.2%', '2026-02-01', c.value * 0.052, v_admin
    FROM contracts c WHERE c.tenant_id = v_tenant AND c.status = 'ACTIVE' LIMIT 3;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 10. PAYMENT LINKS
  -- ═══════════════════════════════════════════════════════════════════════
  IF v_doc_inv1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM payment_links WHERE tenant_id = v_tenant) THEN
    INSERT INTO payment_links (tenant_id, document_id, token, amount, currency, status, expires_at) VALUES
      (v_tenant, v_doc_inv1, 'PAY-' || encode(gen_random_bytes(16), 'hex'), 15000000, 'COP', 'PAID', NOW() + INTERVAL '30 days'),
      (v_tenant, v_doc_inv2, 'PAY-' || encode(gen_random_bytes(16), 'hex'), 8500000, 'COP', 'PENDING', NOW() + INTERVAL '30 days');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 11. MORE APP NOTIFICATIONS (para que se vea lleno)
  -- ═══════════════════════════════════════════════════════════════════════
  IF (SELECT count(*) FROM app_notifications WHERE tenant_id = v_tenant) < 10 THEN
    INSERT INTO app_notifications (tenant_id, user_id, type, title, message) VALUES
      (v_tenant, v_admin, 'ALERT', 'Lote LOT-0005 vence en 7 días', 'El lote LOT-0005 de Vacuna Aftosa tiene fecha de vencimiento próxima. Revise el inventario.'),
      (v_tenant, v_admin, 'INFO', 'OC-2026-00008 recibida parcialmente', 'Se recibieron 150 de 200 unidades del pedido al proveedor Zoetis.'),
      (v_tenant, v_admin, 'WARNING', 'Stock crítico: Jeringas 5ml', 'El producto INS-001 Jeringas Desechables tiene solo 12 unidades en Bodega Bogotá.'),
      (v_tenant, v_admin, 'INFO', 'Factura FV-2026-00015 transmitida a DIAN', 'La factura fue transmitida exitosamente. CUFE generado.'),
      (v_tenant, v_admin, 'ALERT', 'Ticket soporte #TKT-2026-005 escalado', 'El ticket de soporte fue escalado a prioridad CRÍTICA por falla en cadena de frío.'),
      (v_tenant, v_admin, 'INFO', 'Nuevo lead calificado', 'Ana María Quintero de Laboratorio VetLab Pereira fue calificado como oportunidad.'),
      (v_tenant, v_admin, 'WARNING', 'Presupuesto logística al 92%', 'El centro de costo Logística ha consumido el 92% del presupuesto mensual.'),
      (v_tenant, v_admin, 'INFO', 'Mantenimiento completado', 'Orden MO-2026-0003 para Montacargas Toyota completada exitosamente.'),
      (v_tenant, v_admin, 'ALERT', 'Contrato CTR-2026-006 vencido', 'El contrato temporal de personal ha expirado. Requiere renovación o cierre.'),
      (v_tenant, v_admin, 'INFO', 'Backup automático completado', 'Se completó el backup automático de la base de datos a las 03:00 AM.');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════
  -- 12. OVERTIME REQUESTS (si vacía)
  -- ═══════════════════════════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM overtime_requests WHERE tenant_id = v_tenant LIMIT 1) THEN
    INSERT INTO overtime_requests (tenant_id, employee_id, date, start_time, end_time, hours, reason, status) VALUES
      (v_tenant, v_emp1, '2026-03-10', '17:00', '20:00', 3, 'Cierre inventario trimestral', 'APPROVED'),
      (v_tenant, v_emp3, '2026-03-12', '17:00', '19:00', 2, 'Despacho urgente Cali', 'APPROVED'),
      (v_tenant, v_emp2, '2026-03-15', '06:00', '07:00', 1, 'Recepción mercancía importación', 'APPROVED'),
      (v_tenant, v_emp5, '2026-03-18', '17:00', '21:00', 4, 'Preparación pedido ZooCali', 'PENDING'),
      (v_tenant, v_emp4, '2026-03-20', '17:00', '19:30', 2.5, 'Conciliación bancaria fin de mes', 'PENDING'),
      (v_tenant, v_emp1, '2026-03-22', '06:00', '07:00', 1, 'Auditoría cuarto frío', 'APPROVED');
  END IF;

  RAISE NOTICE 'Seed remaining demo data completed successfully';
END $$;
