// apply-governance.mjs
// Aplica la migración de gobernanza directamente via Supabase Management API
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// Project ref extraído de la URL
const PROJECT_REF = 'qoivnsnugfblfebrpifq'
const ACCESS_TOKEN = 'sb_publishable_qpYrOOlHxtTaPI5JIQquKQ_Lbvfy_OH'

async function runSQL(sql) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    })
    const text = await res.text()
    return { status: res.status, body: text }
}

const sqls = [
    {
        label: '1. Sembrar módulos del catálogo base',
        sql: `
INSERT INTO app_modules (key, name, icon) VALUES
('dashboard', 'Dashboard', 'LayoutGrid'),
('accounting', 'Contabilidad', 'Calculator'),
('inventory', 'Inventario', 'Package'),
('logistics', 'Logística', 'Truck'),
('crm', 'CRM & Clientes', 'Users'),
('sales', 'Ventas', 'ShoppingBag'),
('purchasing', 'Compras', 'ShoppingCart'),
('payroll', 'Nómina', 'Banknote'),
('production', 'Producción', 'Factory'),
('treasury', 'Tesorería', 'Wallet'),
('portfolio', 'Cartera', 'History'),
('dian', 'DIAN & Impuestos', 'FileCheck'),
('documents', 'Documentos', 'FileText'),
('analytics', 'Analítica', 'BarChart3'),
('settings', 'Ajustes', 'Settings')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;
`},
    {
        label: '2. Sembrar roles empresariales',
        sql: `
INSERT INTO app_roles (name) VALUES
('ASISTENTE ADMINISTRATIVO'),
('ADMINISTRADOR BODEGA'),
('ASISTENTE LOGISTICO'),
('ASISTENTE COMERCIAL'),
('CONDUCTOR'),
('ASISTENTE TECNICO'),
('AUXILIAR DE LOGISTICA'),
('JEFE ADMINISTRATIVO'),
('REPRESENTANTE COMERCIAL'),
('TECHNICAL MANAGER'),
('ANALISTA DE COMPRAS'),
('APRENDIZ SENA'),
('ASISTENTE DE GERENCIA VENTAS'),
('GESTOR LOGISTICO'),
('AUXILIAR DE FACTURACION'),
('AUXILIAR CONTABLE'),
('CONTADOR'),
('COORDINADOR DE ALMACEN'),
('COORDINADORA DE CALIDAD Y GESTION HUMANA'),
('GENERAL MANAGER'),
('GESTOR DE TESORERIA Y CARTERA'),
('JEFE DE BIOSEGURIDAD'),
('JEFE DE LOGISTICA'),
('OPERARIA DE SERVICIOS GENERALES'),
('SALES AND MARKETING MANAGER'),
('REPRESENTANTE TECNICO'),
('ADMINISTRADOR'),
('SUPER ADMINISTRADOR')
ON CONFLICT (name) DO NOTHING;
`},
    {
        label: '3. Inicializar permisos ADMIN y SUPER ADMIN (todo abierto)',
        sql: `
INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
SELECT r.id, m.key, true, true
FROM app_roles r, app_modules m
WHERE r.name IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR')
ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true, can_edit = true;
`},
    {
        label: '4. Sincronizar role_id para admin existente',
        sql: `
UPDATE user_tenants 
SET role_id = (SELECT id FROM app_roles WHERE name = 'ADMINISTRADOR')
WHERE role = 'admin' AND role_id IS NULL;

UPDATE user_tenants 
SET role_id = (SELECT id FROM app_roles WHERE name = 'SUPER ADMINISTRADOR')
WHERE role = 'SUPER ADMINISTRADOR' AND role_id IS NULL;
`},
    {
        label: '5. Agregar política RLS de escritura para role_permissions',
        sql: `
DROP POLICY IF EXISTS "Allow admin write role_permissions" ON role_permissions;
CREATE POLICY "Allow admin write role_permissions" ON role_permissions
FOR ALL TO authenticated
USING (true)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_tenants 
        WHERE user_id = auth.uid() 
        AND role IN ('ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner')
    )
);
`},
    {
        label: '6. Sincronizar user fbolivarb@gmail.com como SUPER ADMIN',
        sql: `
DO $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'fbolivarb@gmail.com';
    SELECT id INTO v_role_id FROM app_roles WHERE name = 'SUPER ADMINISTRADOR';
    
    IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        UPDATE user_tenants 
        SET role = 'SUPER ADMINISTRADOR', role_id = v_role_id, status = 'active'
        WHERE user_id = v_user_id;
        RAISE NOTICE 'Sincronización SUPER ADMIN completada para fbolivarb@gmail.com';
    END IF;
END $$;
`}
]

async function applyAll() {
    console.log('🚀 Aplicando migraciones de Gobernanza via API...\n')

    for (const step of sqls) {
        process.stdout.write(`⚙️  ${step.label}... `)
        const result = await runSQL(step.sql)
        if (result.status === 200 || result.status === 201) {
            console.log('✅ OK')
        } else {
            console.log(`❌ ERROR [${result.status}]`)
            console.log(`   ${result.body.substring(0, 300)}`)
        }
    }

    // Verificación final
    console.log('\n🔍 Verificando resultado...')
    const check = await runSQL(`
        SELECT 
            (SELECT count(*) FROM app_roles) as roles,
            (SELECT count(*) FROM app_modules) as modules,
            (SELECT count(*) FROM role_permissions WHERE can_view = true) as active_permissions
    `)
    console.log(`Status: ${check.status}`)
    console.log(`Resultado: ${check.body}`)

    console.log('\n✅ Proceso completado.')
}

applyAll().catch(console.error)
