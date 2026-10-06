-- PRP-007 Fase 1: criterios de evaluación por cargo (aprobados por GVM)
-- role_id NULL = criterio transversal que aplica a todos los cargos

CREATE TABLE IF NOT EXISTS performance_criteria (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id     uuid REFERENCES app_roles(id),
    eval_type   text NOT NULL CHECK (eval_type IN ('PROBATION', 'ANNUAL')),
    kind        text NOT NULL CHECK (kind IN ('COMPETENCY', 'JOB_CONDITION', 'OBJECTIVE')),
    criterion   text NOT NULL,
    sort_order  int NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_criteria_tenant_role
    ON performance_criteria (tenant_id, role_id, eval_type);

ALTER TABLE performance_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_tenant" ON performance_criteria FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "pc_insert" ON performance_criteria FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "pc_update" ON performance_criteria FOR UPDATE USING (tenant_id = get_my_tenant_id());

-- Seed: competencias transversales (todos los cargos, ambos tipos)
INSERT INTO performance_criteria (tenant_id, role_id, eval_type, kind, criterion, sort_order)
SELECT t.id, NULL, et.eval_type, 'COMPETENCY', v.criterion, v.sort_order
FROM tenants t
CROSS JOIN (VALUES
    ('puntualidad y asistencia', 1),
    ('trabajo en equipo', 2),
    ('comunicación', 3),
    ('cumplimiento de procesos y registros', 4),
    ('manejo de la información y confidencialidad', 5),
    ('actitud frente al cambio', 6)
) AS v(criterion, sort_order)
CROSS JOIN (VALUES ('PROBATION'), ('ANNUAL')) AS et(eval_type)
WHERE t.name LIKE 'GVM CORPORATION%';

-- Seed: condiciones del cargo (ambos tipos)
INSERT INTO performance_criteria (tenant_id, role_id, eval_type, kind, criterion, sort_order)
SELECT t.id, r.id, et.eval_type, 'JOB_CONDITION', v.criterion, v.sort_order
FROM tenants t
JOIN (VALUES
    ('ADMINISTRADOR BODEGA', 'Registra entradas/salidas sin diferencias', 1),
    ('ADMINISTRADOR BODEGA', 'Ejecuta conteos y reporta novedades', 2),
    ('ADMINISTRADOR BODEGA', 'Cumple normas de manejo de producto', 3),
    ('ASISTENTE LOGISTICO', 'Programa despachos según ruta', 1),
    ('ASISTENTE LOGISTICO', 'Confirma entregas en el sistema', 2),
    ('ASISTENTE LOGISTICO', 'Gestiona documentos de transporte', 3),
    ('AUXILIAR DE LOGISTICA', 'Prepara pedidos sin errores de referencia/cantidad', 1),
    ('AUXILIAR DE LOGISTICA', 'Cumple protocolo de empaque', 2),
    ('AUXILIAR DE LOGISTICA', 'Reporta faltantes al día', 3),
    ('GESTOR LOGISTICO', 'Planea rutas y despachos', 1),
    ('GESTOR LOGISTICO', 'Controla costos de transporte', 2),
    ('GESTOR LOGISTICO', 'Coordina con clientes y conductores', 3),
    ('REPRESENTANTE COMERCIAL', 'Registra visitas y gestiona su cartera en CRM', 1),
    ('REPRESENTANTE COMERCIAL', 'Presenta cotizaciones en tiempos acordados', 2),
    ('REPRESENTANTE COMERCIAL', 'Cumple cuota de ventas', 3),
    ('ASISTENTE COMERCIAL', 'Atiende solicitudes de clientes en tiempo', 1),
    ('ASISTENTE COMERCIAL', 'Mantiene datos de clientes actualizados', 2),
    ('ASISTENTE COMERCIAL', 'Gestiona pedidos sin errores', 3),
    ('ASISTENTE DE GERENCIA VENTAS', 'Organiza agenda y reuniones de ventas', 1),
    ('ASISTENTE DE GERENCIA VENTAS', 'Prepara informes de gestión', 2),
    ('ASISTENTE DE GERENCIA VENTAS', 'Hace seguimiento de compromisos', 3),
    ('AUXILIAR CONTABLE', 'Registra documentos con soporte completo', 1),
    ('AUXILIAR CONTABLE', 'Realiza conciliaciones en plazo', 2),
    ('AUXILIAR CONTABLE', 'Cumple cierres mensuales', 3),
    ('AUXILIAR DE FACTURACION', 'Emite documentos electrónicos sin rechazo', 1),
    ('AUXILIAR DE FACTURACION', 'Verifica datos del cliente antes de facturar', 2),
    ('CONTADOR GENERAL', 'Estados financieros en plazo', 1),
    ('CONTADOR GENERAL', 'Cumplimiento tributario', 2),
    ('CONTADOR GENERAL', 'Respuesta a requerimientos', 3),
    ('GESTOR DE TESORERIA Y CARTERA', 'Conciliación bancaria al día', 1),
    ('GESTOR DE TESORERIA Y CARTERA', 'Gestión de cartera vencida', 2),
    ('GESTOR DE TESORERIA Y CARTERA', 'Proyección de flujo de caja', 3),
    ('ASISTENTE ADMINISTRATIVO', 'Gestiona documentación y archivo', 1),
    ('ASISTENTE ADMINISTRATIVO', 'Atiende requerimientos internos', 2),
    ('ASISTENTE ADMINISTRATIVO', 'Apoya nómina y RRHH en plazos', 3),
    ('ASISTENTE TECNICO', 'Atiende soporte de campo con registro de visita', 1),
    ('ASISTENTE TECNICO', 'Cumple protocolos de seguridad', 2),
    ('ASISTENTE TECNICO', 'Documenta servicios', 3),
    ('CONDUCTOR', 'Cumple rutas y tiempos', 1),
    ('CONDUCTOR', 'Mantiene vehículo y documentos al día', 2),
    ('CONDUCTOR', 'Confirma entregas con soporte', 3),
    ('COORDINADOR DE ALMACEN', 'Supervisa recepción y despacho', 1),
    ('COORDINADOR DE ALMACEN', 'Controla inventario y ubicaciones', 2),
    ('COORDINADOR DE ALMACEN', 'Lidera al equipo de bodega', 3),
    ('COORDINADORA DE CALIDAD Y GESTION HUMANA', 'Gestiona hallazgos de calidad y acciones correctivas', 1),
    ('COORDINADORA DE CALIDAD Y GESTION HUMANA', 'Administra procesos de RRHH en plazo', 2),
    ('DIRECTOR DE COMPRAS Y COMERCIO EXTERIOR', 'Gestiona proveedores nacionales e internacionales', 1),
    ('DIRECTOR DE COMPRAS Y COMERCIO EXTERIOR', 'Cumple plazos de compra', 2),
    ('DIRECTOR DE COMPRAS Y COMERCIO EXTERIOR', 'Controla costos de importación', 3),
    ('JEFE ADMINISTRATIVO', 'Lidera finanzas y RRHH', 1),
    ('JEFE ADMINISTRATIVO', 'Aprueba solicitudes en plazo', 2),
    ('JEFE ADMINISTRATIVO', 'Cumple cierres y obligaciones', 3),
    ('JEFE DE BIOSEGURIDAD', 'Controla producción y calidad según normativa', 1),
    ('JEFE DE BIOSEGURIDAD', 'Gestiona riesgos y registros', 2),
    ('JEFE DE BIOSEGURIDAD', 'Responde auditorías', 3),
    ('OPERARIA DE SERVICIOS GENERALES', 'Cumple plan de aseo y mantenimiento', 1),
    ('OPERARIA DE SERVICIOS GENERALES', 'Reporta daños oportunamente', 2),
    ('OPERARIA DE SERVICIOS GENERALES', 'Usa elementos de seguridad', 3),
    ('SALES AND MARKETING MANAGER', 'Lidera plan comercial y de marketing', 1),
    ('SALES AND MARKETING MANAGER', 'Cumple metas de ventas', 2),
    ('SALES AND MARKETING MANAGER', 'Gestiona al equipo comercial', 3),
    ('TECHNICAL MANAGER', 'Lidera producción e inventario técnico', 1),
    ('TECHNICAL MANAGER', 'Cumple programación', 2),
    ('TECHNICAL MANAGER', 'Controla calidad del proceso', 3),
    ('APRENDIZ SENA', 'Cumple plan de formación y horario', 1),
    ('APRENDIZ SENA', 'Aprende y aplica las tareas asignadas', 2),
    ('APRENDIZ SENA', 'Entrega evidencias de la etapa', 3)
) AS v(role_name, criterion, sort_order) ON true
JOIN app_roles r ON r.name = v.role_name
CROSS JOIN (VALUES ('PROBATION'), ('ANNUAL')) AS et(eval_type)
WHERE t.name LIKE 'GVM CORPORATION%';

-- Seed: objetivos (solo evaluación anual)
INSERT INTO performance_criteria (tenant_id, role_id, eval_type, kind, criterion, sort_order)
SELECT t.id, r.id, 'ANNUAL', 'OBJECTIVE', v.criterion, v.sort_order
FROM tenants t
JOIN (VALUES
    ('ADMINISTRADOR BODEGA', 'Exactitud de inventario físico vs. sistema', 1),
    ('ADMINISTRADOR BODEGA', 'Tiempo de despacho', 2),
    ('ASISTENTE LOGISTICO', 'Cumplimiento de entregas a tiempo', 1),
    ('ASISTENTE LOGISTICO', 'Errores de documentación', 2),
    ('AUXILIAR DE LOGISTICA', 'Pedidos preparados sin error', 1),
    ('AUXILIAR DE LOGISTICA', 'Productividad diaria', 2),
    ('GESTOR LOGISTICO', 'Costo de transporte por despacho', 1),
    ('GESTOR LOGISTICO', 'Nivel de servicio', 2),
    ('REPRESENTANTE COMERCIAL', 'Cumplimiento de cuota', 1),
    ('REPRESENTANTE COMERCIAL', 'Cartera activa visitada', 2),
    ('REPRESENTANTE COMERCIAL', 'Recaudo oportuno', 3),
    ('ASISTENTE COMERCIAL', 'Tiempo de respuesta', 1),
    ('ASISTENTE COMERCIAL', 'Pedidos sin reproceso', 2),
    ('ASISTENTE DE GERENCIA VENTAS', 'Informes entregados a tiempo', 1),
    ('ASISTENTE DE GERENCIA VENTAS', 'Compromisos cerrados', 2),
    ('AUXILIAR CONTABLE', 'Conciliaciones al día', 1),
    ('AUXILIAR CONTABLE', 'Errores de registro', 2),
    ('AUXILIAR DE FACTURACION', 'Documentos aceptados a la primera', 1),
    ('AUXILIAR DE FACTURACION', 'Tiempo de facturación', 2),
    ('CONTADOR GENERAL', 'Cierres en plazo', 1),
    ('CONTADOR GENERAL', 'Hallazgos de auditoría', 2),
    ('GESTOR DE TESORERIA Y CARTERA', 'Recaudo vs. meta', 1),
    ('GESTOR DE TESORERIA Y CARTERA', 'Cartera vencida reducida', 2),
    ('ASISTENTE ADMINISTRATIVO', 'Trámites resueltos a tiempo', 1),
    ('ASISTENTE TECNICO', 'Servicios cerrados a tiempo', 1),
    ('ASISTENTE TECNICO', 'Reincidencias', 2),
    ('CONDUCTOR', 'Entregas a tiempo', 1),
    ('CONDUCTOR', 'Cero incidentes de tránsito', 2),
    ('COORDINADOR DE ALMACEN', 'Exactitud de inventario', 1),
    ('COORDINADOR DE ALMACEN', 'Cumplimiento de operación', 2),
    ('COORDINADORA DE CALIDAD Y GESTION HUMANA', 'Acciones correctivas cerradas', 1),
    ('COORDINADORA DE CALIDAD Y GESTION HUMANA', 'Procesos de RRHH en plazo', 2),
    ('DIRECTOR DE COMPRAS Y COMERCIO EXTERIOR', 'Ahorro en compras', 1),
    ('DIRECTOR DE COMPRAS Y COMERCIO EXTERIOR', 'Cumplimiento de entregas de proveedores', 2),
    ('JEFE ADMINISTRATIVO', 'Cierres en plazo', 1),
    ('JEFE ADMINISTRATIVO', 'Gestión de equipo', 2),
    ('JEFE DE BIOSEGURIDAD', 'Hallazgos de auditoría', 1),
    ('JEFE DE BIOSEGURIDAD', 'Cumplimiento de controles', 2),
    ('OPERARIA DE SERVICIOS GENERALES', 'Cumplimiento del plan de aseo', 1),
    ('SALES AND MARKETING MANAGER', 'Meta de ventas', 1),
    ('SALES AND MARKETING MANAGER', 'Crecimiento de cartera', 2),
    ('TECHNICAL MANAGER', 'Cumplimiento de producción', 1),
    ('TECHNICAL MANAGER', 'Exactitud de inventario', 2),
    ('APRENDIZ SENA', 'Cumplimiento del plan de formación', 1)
) AS v(role_name, criterion, sort_order) ON true
JOIN app_roles r ON r.name = v.role_name
WHERE t.name LIKE 'GVM CORPORATION%';
