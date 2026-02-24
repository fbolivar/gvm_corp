-- ==========================================
-- 🛡️ SCRIPT DE SANITIZACIÓN "DÍA CERO" V3
-- ==========================================
-- Propósito: Limpiar toda la data transaccional y de prueba (Integrity Lab)
-- Preservando: Estructura de Tenant, Usuarios, Catálogo de Cuentas (PUC) y Configuración Base.

BEGIN;

-- 1. Limpieza de Auditoría y Logs
TRUNCATE TABLE public.audit_log CASCADE;
TRUNCATE TABLE public.app_notifications CASCADE;
TRUNCATE TABLE public.support_audit_log CASCADE;

-- 2. Limpieza de Transacciones de Tesorería (Caja/Bancos)
TRUNCATE TABLE public.treasury_transactions CASCADE;
TRUNCATE TABLE public.payment_allocations CASCADE;
TRUNCATE TABLE public.transaction_withholdings CASCADE;
TRUNCATE TABLE public.bank_statement_lines CASCADE;
TRUNCATE TABLE public.bank_statements CASCADE;

-- 3. Limpieza de Contabilidad (Libro Diario / Auxiliares)
TRUNCATE TABLE public.journal_entries CASCADE;
TRUNCATE TABLE public.journal_lines CASCADE;

-- 4. Limpieza de Documentos (Facturas, Compras, Nóminas)
TRUNCATE TABLE public.documents CASCADE;
TRUNCATE TABLE public.document_lines CASCADE;
TRUNCATE TABLE public.electronic_documents CASCADE;

-- 5. Limpieza de Inventarios (Movimientos y Stock)
TRUNCATE TABLE public.inventory_movements CASCADE;
-- Nota: product_stock se recalcula o se puede resetear a cero
UPDATE public.product_stock SET qty = 0, avg_cost = 0;

-- 6. Limpieza de Nómina (Préstamos, Asistencia, Liquidaciones)
TRUNCATE TABLE public.payroll_attendance CASCADE;
TRUNCATE TABLE public.payroll_loans CASCADE;
TRUNCATE TABLE public.payroll_loan_installments CASCADE;
TRUNCATE TABLE public.payroll_benefits CASCADE;

-- 7. Limpieza de CRM y Soporte
TRUNCATE TABLE public.crm_opportunities CASCADE;
TRUNCATE TABLE public.leads CASCADE;
TRUNCATE TABLE public.support_tickets CASCADE;
TRUNCATE TABLE public.support_interactions CASCADE;

-- 8. Limpieza de Chat
TRUNCATE TABLE public.chat_messages CASCADE;
TRUNCATE TABLE public.chat_reactions CASCADE;

-- 9. Terceros y Empleados (Opcional, usualmente se limpian si son de prueba)
-- Si desea mantener sus empleados de prueba, comente estas líneas
-- TRUNCATE TABLE public.employees CASCADE;
-- TRUNCATE TABLE public.parties CASCADE;

COMMIT;

-- ==========================================
-- ✅ SISTEMA BLINDADO Y LISTO PARA PRODUCCIÓN
-- ==========================================
