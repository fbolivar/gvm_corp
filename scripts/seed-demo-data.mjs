/**
 * seed-demo-data.mjs
 * Populates GVM Corporation S.A.S. Supabase database with realistic
 * demo data for a Colombian veterinary medicine company.
 *
 * Usage: node scripts/seed-demo-data.mjs
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const TENANT_ID    = 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9'
const ADMIN_USER   = '4d529f53-df07-434d-a7b6-d3e9b3f34634'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local')
  process.exit(1)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

async function insert(table, rows, onConflict = null) {
  const url = onConflict
    ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`
    : `${SUPABASE_URL}/rest/v1/${table}`
  const prefer = onConflict
    ? 'return=representation,resolution=ignore-duplicates'
    : 'return=representation'
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': prefer },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`  ERROR inserting into ${table}:`, err.slice(0, 300))
    return []
  }
  const data = await res.json()
  summary[table] = (summary[table] || 0) + data.length
  console.log(`  ✓ ${table}: ${data.length} rows`)
  return data
}

async function insertOrFetch(table, rows, fetchFilter, onConflict = null) {
  await insert(table, rows, onConflict)
  return queryTenant(table, fetchFilter)
}

async function insertIfEmpty(table, rows, fetchFilter) {
  const existing = await queryTenant(table, fetchFilter)
  if (existing.length > 0) {
    console.log(`  ↩ ${table}: ${existing.length} rows already exist, skipping`)
    return existing
  }
  await insert(table, rows)
  return queryTenant(table, fetchFilter)
}

async function queryTenant(table, params = '') {
  const sep = params ? '&' : ''
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?tenant_id=eq.${TENANT_ID}${sep}${params}&limit=500`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) return []
  return res.json()
}

async function query(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}&limit=500`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) return []
  return res.json()
}

function spreadDate(startDays, endDays) {
  const now = new Date('2026-03-25T12:00:00Z')
  const offset = Math.floor(Math.random() * (endDays - startDays + 1)) + startDays
  now.setDate(now.getDate() - offset)
  return now.toISOString().split('T')[0]
}

function spreadTs(startDays, endDays) {
  const now = new Date('2026-03-25T12:00:00Z')
  const offset = Math.floor(Math.random() * (endDays - startDays + 1)) + startDays
  now.setDate(now.getDate() - offset)
  now.setHours(rand(6, 18), rand(0, 59), 0, 0)
  return now.toISOString()
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function round2(n) { return Math.round(n * 100) / 100 }

const summary = {}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PARTIES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedParties() {
  console.log('\n📋 Seeding PARTIES...')
  const customers = [
    { legal_name: 'Clinica Veterinaria El Roble', trade_name: 'VetRoble', doc_type: 'NIT', doc_number: '900123456', nit: '900123456', dv: '1', email: 'admin@vetroble.com', phone: '+573001234567', is_customer: true, is_vendor: false },
    { legal_name: 'Agropecuaria Los Andes S.A.S', trade_name: 'AgroAndes', doc_type: 'NIT', doc_number: '900234567', nit: '900234567', dv: '3', email: 'compras@agroandes.co', phone: '+573012345678', is_customer: true, is_vendor: false },
    { legal_name: 'Hospital Veterinario San Marcos', trade_name: 'HVSanMarcos', doc_type: 'NIT', doc_number: '900345678', nit: '900345678', dv: '5', email: 'direccion@hvsanmarcos.com', phone: '+573023456789', is_customer: true, is_vendor: false },
    { legal_name: 'PetShop Colombia S.A.S', trade_name: 'PetShop', doc_type: 'NIT', doc_number: '900456789', nit: '900456789', dv: '7', email: 'compras@petshop.co', phone: '+573034567890', is_customer: true, is_vendor: false },
    { legal_name: 'Zoologico de Cali', trade_name: 'ZooCali', doc_type: 'NIT', doc_number: '900567890', nit: '900567890', dv: '2', email: 'admon@zoocali.org', phone: '+573045678901', is_customer: true, is_vendor: false },
    { legal_name: 'Finca Ganadera La Esperanza', trade_name: 'La Esperanza', doc_type: 'NIT', doc_number: '900678901', nit: '900678901', dv: '4', email: 'gerencia@laesperanza.co', phone: '+573056789012', is_customer: true, is_vendor: false },
    { legal_name: 'Universidad Nacional - Fac. Veterinaria', trade_name: 'UNAL Vet', doc_type: 'NIT', doc_number: '899999999', nit: '899999999', dv: '6', email: 'lab.vet@unal.edu.co', phone: '+573067890123', is_customer: true, is_vendor: false },
    { legal_name: 'Avicola del Valle S.A', trade_name: 'AviValle', doc_type: 'NIT', doc_number: '900789012', nit: '900789012', dv: '8', email: 'produccion@avivalle.com', phone: '+573078901234', is_customer: true, is_vendor: false },
    { legal_name: 'Hacienda Bonanza Ltda', trade_name: 'Bonanza', doc_type: 'NIT', doc_number: '900890123', nit: '900890123', dv: '0', email: 'admin@bonanza.co', phone: '+573089012345', is_customer: true, is_vendor: false },
    { legal_name: 'Porcicola Santa Rosa S.A.S', trade_name: 'PorciRosa', doc_type: 'NIT', doc_number: '900901234', nit: '900901234', dv: '9', email: 'compras@porcirosa.com', phone: '+573090123456', is_customer: true, is_vendor: false },
    { legal_name: 'Acuicultura Caribe S.A.S', trade_name: 'AcuiCaribe', doc_type: 'NIT', doc_number: '901012345', nit: '901012345', dv: '1', email: 'operaciones@acuicaribe.com', phone: '+573101234567', is_customer: true, is_vendor: false },
    { legal_name: 'Equinos del Llano S.A.S', trade_name: 'EquiLlano', doc_type: 'NIT', doc_number: '901123456', nit: '901123456', dv: '3', email: 'admin@equillano.co', phone: '+573112345678', is_customer: true, is_vendor: false },
    { legal_name: 'Centro Canino Bogota', trade_name: 'CentroCan', doc_type: 'NIT', doc_number: '901234567', nit: '901234567', dv: '5', email: 'info@centrocan.com', phone: '+573123456789', is_customer: true, is_vendor: false },
    { legal_name: 'Apicultura Santander S.A.S', trade_name: 'ApiSantander', doc_type: 'NIT', doc_number: '901345678', nit: '901345678', dv: '7', email: 'ventas@apisantander.co', phone: '+573134567890', is_customer: true, is_vendor: false },
    { legal_name: 'Ganaderia Premium del Meta', trade_name: 'GanaPremium', doc_type: 'NIT', doc_number: '901456789', nit: '901456789', dv: '2', email: 'gerencia@ganapremium.co', phone: '+573145678901', is_customer: true, is_vendor: false },
  ]
  const vendors = [
    { legal_name: 'Laboratorios Vecol S.A', trade_name: 'Vecol', doc_type: 'NIT', doc_number: '800012345', nit: '800012345', dv: '1', email: 'ventas@vecol.com.co', phone: '+576012345678', is_customer: false, is_vendor: true },
    { legal_name: 'Zoetis Colombia S.A.S', trade_name: 'Zoetis', doc_type: 'NIT', doc_number: '800123456', nit: '800123456', dv: '3', email: 'pedidos@zoetis.co', phone: '+576023456789', is_customer: false, is_vendor: true },
    { legal_name: 'MSD Salud Animal Colombia', trade_name: 'MSD Animal', doc_type: 'NIT', doc_number: '800234567', nit: '800234567', dv: '5', email: 'ordenes@msd-animal.co', phone: '+576034567890', is_customer: false, is_vendor: true },
    { legal_name: 'Bayer CropScience Colombia', trade_name: 'Bayer Vet', doc_type: 'NIT', doc_number: '800345678', nit: '800345678', dv: '7', email: 'veterinaria@bayer.co', phone: '+576045678901', is_customer: false, is_vendor: true },
    { legal_name: 'Boehringer Ingelheim Col.', trade_name: 'Boehringer', doc_type: 'NIT', doc_number: '800456789', nit: '800456789', dv: '9', email: 'vet@boehringer.co', phone: '+576056789012', is_customer: false, is_vendor: true },
    { legal_name: 'Equipos Medicos Veterinarios S.A.S', trade_name: 'EquiMedVet', doc_type: 'NIT', doc_number: '800567890', nit: '800567890', dv: '2', email: 'ventas@equimedvet.co', phone: '+576067890123', is_customer: false, is_vendor: true },
    { legal_name: 'Insumos Quirurgicos del Caribe', trade_name: 'InsuQuir', doc_type: 'NIT', doc_number: '800678901', nit: '800678901', dv: '4', email: 'pedidos@insuquir.com', phone: '+576078901234', is_customer: false, is_vendor: true },
    { legal_name: 'Nutri-Animal Colombia S.A.S', trade_name: 'NutriAnimal', doc_type: 'NIT', doc_number: '800789012', nit: '800789012', dv: '6', email: 'ventas@nutrianimal.co', phone: '+576089012345', is_customer: false, is_vendor: true },
    { legal_name: 'BioVet Laboratorios S.A', trade_name: 'BioVet', doc_type: 'NIT', doc_number: '800890123', nit: '800890123', dv: '8', email: 'comercial@biovet.co', phone: '+576090123456', is_customer: false, is_vendor: true },
    { legal_name: 'Empaques Farmaceuticos S.A.S', trade_name: 'EmpaFarma', doc_type: 'NIT', doc_number: '800901234', nit: '800901234', dv: '0', email: 'ventas@empafarma.co', phone: '+576101234567', is_customer: false, is_vendor: true },
  ]
  const all = [...customers, ...vendors].map(p => ({ ...p, tenant_id: TENANT_ID, party_type: 'COMPANY' }))
  return insertOrFetch('parties', all, 'order=legal_name', 'tenant_id,doc_type,doc_number')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProducts() {
  console.log('\n📦 Seeding PRODUCTS...')
  const prods = [
    { sku: 'MED-001', name: 'Ivermectina 1% Inyectable 50ml', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-002', name: 'Amoxicilina 500mg Tabletas x100', type: 'GOOD', uom: 'BOX' },
    { sku: 'MED-003', name: 'Ketoprofeno 10% Inyectable 100ml', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-004', name: 'Oxitetraciclina LA 200mg/ml 250ml', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-005', name: 'Albendazol 10% Suspension 1L', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-006', name: 'Dexametasona 2mg/ml 50ml', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-007', name: 'Enrofloxacina 10% Oral 1L', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-008', name: 'Vitamina AD3E Inyectable 250ml', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-009', name: 'Fipronil Spray Antipulgas 250ml', type: 'GOOD', uom: 'UNIT' },
    { sku: 'MED-010', name: 'Vacuna Triple Canina x10 dosis', type: 'GOOD', uom: 'BOX' },
    { sku: 'VAC-001', name: 'Vacuna Aftosa Bivalente x25 dosis', type: 'GOOD', uom: 'BOX' },
    { sku: 'VAC-002', name: 'Vacuna Newcastle + Bronquitis x1000', type: 'GOOD', uom: 'BOX' },
    { sku: 'VAC-003', name: 'Vacuna Rabia Canina x1 dosis', type: 'GOOD', uom: 'UNIT' },
    { sku: 'EQP-001', name: 'Ecografo Veterinario Portatil', type: 'GOOD', uom: 'UNIT', is_fixed_asset: true, track_serials: true },
    { sku: 'EQP-002', name: 'Mesa de Cirugia Veterinaria', type: 'GOOD', uom: 'UNIT', is_fixed_asset: true, track_serials: true },
    { sku: 'EQP-003', name: 'Autoclave 20L Digital', type: 'GOOD', uom: 'UNIT', is_fixed_asset: true, track_serials: true },
    { sku: 'EQP-004', name: 'Microscopio Binocular LED', type: 'GOOD', uom: 'UNIT', is_fixed_asset: true, track_serials: true },
    { sku: 'INS-001', name: 'Jeringas Desechables 5ml x100', type: 'GOOD', uom: 'BOX' },
    { sku: 'INS-002', name: 'Agujas Hipodermicas 18G x100', type: 'GOOD', uom: 'BOX' },
    { sku: 'INS-003', name: 'Guantes Latex Talla M x100', type: 'GOOD', uom: 'BOX' },
    { sku: 'INS-004', name: 'Gasas Esteriles 10x10cm x100', type: 'GOOD', uom: 'BOX' },
    { sku: 'INS-005', name: 'Sutura Nylon 3-0 x12', type: 'GOOD', uom: 'BOX' },
    { sku: 'INS-006', name: 'Cateter IV 22G x50', type: 'GOOD', uom: 'BOX' },
    { sku: 'NUT-001', name: 'Concentrado Bovino Lechero 40kg', type: 'GOOD', uom: 'SACK' },
    { sku: 'NUT-002', name: 'Sal Mineralizada Ganado 25kg', type: 'GOOD', uom: 'SACK' },
    { sku: 'NUT-003', name: 'Premezcla Avicola Engorde 25kg', type: 'GOOD', uom: 'SACK' },
    { sku: 'LAB-001', name: 'Kit Hemograma Completo x50 tests', type: 'GOOD', uom: 'KIT' },
    { sku: 'LAB-002', name: 'Kit Quimica Sanguinea x25 tests', type: 'GOOD', uom: 'KIT' },
    { sku: 'SRV-001', name: 'Consulta Veterinaria General', type: 'SERVICE', uom: 'UNIT' },
    { sku: 'SRV-002', name: 'Cirugia Menor Veterinaria', type: 'SERVICE', uom: 'UNIT' },
    { sku: 'SRV-003', name: 'Asistencia Tecnica Ganadera (dia)', type: 'SERVICE', uom: 'DAY' },
    { sku: 'SRV-004', name: 'Capacitacion Manejo Sanitario', type: 'SERVICE', uom: 'HOUR' },
  ].map(p => ({ ...p, tenant_id: TENANT_ID, status: 'active', is_fixed_asset: p.is_fixed_asset || false, track_serials: p.track_serials || false }))
  return insertOrFetch('products', prods, 'order=sku', 'tenant_id,sku')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. WAREHOUSES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedWarehouses() {
  console.log('\n🏭 Seeding WAREHOUSES...')
  const whs = [
    { code: 'BOG-01', name: 'Bodega Principal Bogota' },
    { code: 'MED-01', name: 'Bodega Medellin' },
    { code: 'CAL-01', name: 'Bodega Cali' },
    { code: 'FRI-01', name: 'Cuarto Frio Vacunas' },
  ].map(w => ({ ...w, tenant_id: TENANT_ID }))
  return insertIfEmpty('warehouses', whs, 'order=code')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EMPLOYEES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedEmployees() {
  console.log('\n👥 Seeding EMPLOYEES...')
  const empData = [
    { legal_name: 'Carlos Eduardo Martinez Lopez', doc_type: 'CC', doc_number: '79845632', email: 'carlos.martinez@gvm.co', phone: '+573201234567', salary: 8500000, start_date: '2022-03-15' },
    { legal_name: 'Maria Fernanda Rodriguez Pena', doc_type: 'CC', doc_number: '52987654', email: 'maria.rodriguez@gvm.co', phone: '+573202345678', salary: 7200000, start_date: '2022-06-01' },
    { legal_name: 'Andres Felipe Gomez Torres', doc_type: 'CC', doc_number: '80123456', email: 'andres.gomez@gvm.co', phone: '+573203456789', salary: 4500000, start_date: '2023-01-10' },
    { legal_name: 'Laura Catalina Herrera Diaz', doc_type: 'CC', doc_number: '53654321', email: 'laura.herrera@gvm.co', phone: '+573204567890', salary: 5800000, start_date: '2022-09-20' },
    { legal_name: 'Juan Pablo Vargas Ruiz', doc_type: 'CC', doc_number: '80234567', email: 'juan.vargas@gvm.co', phone: '+573205678901', salary: 3200000, start_date: '2023-04-15' },
    { legal_name: 'Diana Marcela Ospina Castro', doc_type: 'CC', doc_number: '53765432', email: 'diana.ospina@gvm.co', phone: '+573206789012', salary: 6500000, start_date: '2022-11-01' },
    { legal_name: 'Santiago Andres Moreno Luna', doc_type: 'CC', doc_number: '80345678', email: 'santiago.moreno@gvm.co', phone: '+573207890123', salary: 3800000, start_date: '2023-08-05' },
    { legal_name: 'Valentina Reyes Cardona', doc_type: 'CC', doc_number: '53876543', email: 'valentina.reyes@gvm.co', phone: '+573208901234', salary: 4200000, start_date: '2023-02-28' },
    { legal_name: 'Diego Alejandro Munoz Parra', doc_type: 'CC', doc_number: '80456789', email: 'diego.munoz@gvm.co', phone: '+573209012345', salary: 2800000, start_date: '2024-01-15' },
    { legal_name: 'Camila Andrea Sanchez Gil', doc_type: 'CC', doc_number: '53987654', email: 'camila.sanchez@gvm.co', phone: '+573210123456', salary: 3500000, start_date: '2023-06-10' },
    { legal_name: 'Sebastian Garcia Mejia', doc_type: 'CC', doc_number: '80567890', email: 'sebastian.garcia@gvm.co', phone: '+573211234567', salary: 2500000, start_date: '2024-03-01' },
    { legal_name: 'Natalia Rios Castano', doc_type: 'CC', doc_number: '54098765', email: 'natalia.rios@gvm.co', phone: '+573212345678', salary: 3000000, start_date: '2023-11-20' },
    { legal_name: 'Miguel Angel Betancur Vera', doc_type: 'CC', doc_number: '80678901', email: 'miguel.betancur@gvm.co', phone: '+573213456789', salary: 2200000, start_date: '2024-06-01' },
    { legal_name: 'Paola Andrea Jimenez Florez', doc_type: 'CC', doc_number: '54109876', email: 'paola.jimenez@gvm.co', phone: '+573214567890', salary: 1800000, start_date: '2025-01-15' },
    { legal_name: 'Hector Fabio Londono Arias', doc_type: 'CC', doc_number: '80789012', email: 'hector.londono@gvm.co', phone: '+573215678901', salary: 4000000, start_date: '2022-07-01' },
  ]

  // Check if employees already exist
  const existingEmps = await queryTenant('employees', 'order=created_at&limit=1')
  if (existingEmps.length > 0) {
    console.log(`  ↩ employees: already seeded, fetching...`)
    return queryTenant('employees', 'order=created_at')
  }

  // Create PERSON parties first, then employees
  const partyRows = empData.map(e => ({
    tenant_id: TENANT_ID,
    party_type: 'PERSON',
    legal_name: e.legal_name,
    doc_type: e.doc_type,
    doc_number: e.doc_number,
    email: e.email,
    phone: e.phone,
    is_customer: false,
    is_vendor: false,
  }))
  const insertedParties = await insert('parties', partyRows, 'tenant_id,doc_type,doc_number')
  if (!insertedParties.length) {
    // Parties might already exist — fetch them by doc_number
    const allParties = await queryTenant('parties', `doc_type=eq.CC&is_customer=eq.false&is_vendor=eq.false&order=doc_number`)
    const partyMap = Object.fromEntries(allParties.map(p => [p.doc_number, p.id]))
    const empRows = empData.map(e => ({
      tenant_id: TENANT_ID,
      party_id: partyMap[e.doc_number],
      contract_type: 'INDEFINITE',
      start_date: e.start_date,
      salary: e.salary,
      transport_allowance: true,
      risk_level: 1,
      payment_method: 'TRANSFER',
      status: 'ACTIVE',
    })).filter(e => e.party_id)
    if (!empRows.length) return []
    await insert('employees', empRows)
    return queryTenant('employees', 'order=created_at')
  }

  const partyMap = Object.fromEntries(insertedParties.map((p, i) => [empData[i].doc_number, p.id]))
  const empRows = empData.map(e => ({
    tenant_id: TENANT_ID,
    party_id: partyMap[e.doc_number],
    contract_type: 'INDEFINITE',
    start_date: e.start_date,
    salary: e.salary,
    transport_allowance: true,
    risk_level: 1,
    payment_method: 'TRANSFER',
    status: 'ACTIVE',
  })).filter(e => e.party_id)
  await insert('employees', empRows)
  return queryTenant('employees', 'order=created_at')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CHART OF ACCOUNTS (PUC)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedChartAccounts() {
  console.log('\n📊 Seeding CHART OF ACCOUNTS...')
  const accounts = [
    { code: '1105', name: 'Caja General', nature: 'DEBIT', is_auxiliary: true },
    { code: '1110', name: 'Bancos Nacionales', nature: 'DEBIT', is_auxiliary: true },
    { code: '1305', name: 'Clientes Nacionales', nature: 'DEBIT', is_auxiliary: true },
    { code: '1355', name: 'Anticipos y Avances', nature: 'DEBIT', is_auxiliary: true },
    { code: '1435', name: 'Mercancias No Fabricadas', nature: 'DEBIT', is_auxiliary: true },
    { code: '1520', name: 'Maquinaria y Equipo', nature: 'DEBIT', is_auxiliary: true },
    { code: '1524', name: 'Equipo de Oficina', nature: 'DEBIT', is_auxiliary: true },
    { code: '1528', name: 'Equipo de Computacion', nature: 'DEBIT', is_auxiliary: true },
    { code: '1592', name: 'Depreciacion Acumulada', nature: 'CREDIT', is_auxiliary: true },
    { code: '2105', name: 'Obligaciones Financieras', nature: 'CREDIT', is_auxiliary: true },
    { code: '2205', name: 'Proveedores Nacionales', nature: 'CREDIT', is_auxiliary: true },
    { code: '2335', name: 'Costos y Gastos por Pagar', nature: 'CREDIT', is_auxiliary: true },
    { code: '2365', name: 'Retencion en la Fuente', nature: 'CREDIT', is_auxiliary: true },
    { code: '2367', name: 'IVA por Pagar', nature: 'CREDIT', is_auxiliary: true },
    { code: '2370', name: 'Retenciones y Aportes Nomina', nature: 'CREDIT', is_auxiliary: true },
    { code: '2505', name: 'Salarios por Pagar', nature: 'CREDIT', is_auxiliary: true },
    { code: '3105', name: 'Capital Suscrito y Pagado', nature: 'CREDIT', is_auxiliary: true },
    { code: '3305', name: 'Reserva Legal', nature: 'CREDIT', is_auxiliary: true },
    { code: '3605', name: 'Utilidades del Ejercicio', nature: 'CREDIT', is_auxiliary: true },
    { code: '4135', name: 'Comercio al por Mayor y Menor', nature: 'CREDIT', is_auxiliary: true },
    { code: '4175', name: 'Ingresos por Servicios', nature: 'CREDIT', is_auxiliary: true },
    { code: '5105', name: 'Gastos de Personal', nature: 'DEBIT', is_auxiliary: true },
    { code: '5110', name: 'Honorarios', nature: 'DEBIT', is_auxiliary: true },
    { code: '5120', name: 'Arrendamientos', nature: 'DEBIT', is_auxiliary: true },
    { code: '5135', name: 'Servicios', nature: 'DEBIT', is_auxiliary: true },
    { code: '5195', name: 'Diversos', nature: 'DEBIT', is_auxiliary: true },
    { code: '5305', name: 'Gastos Financieros', nature: 'DEBIT', is_auxiliary: true },
    { code: '6135', name: 'Costo de Mercancia Vendida', nature: 'DEBIT', is_auxiliary: true },
  ].map(a => ({ ...a, tenant_id: TENANT_ID }))
  return insertOrFetch('chart_accounts', accounts, 'order=code', 'tenant_id,code')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TREASURY ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedTreasuryAccounts() {
  console.log('\n🏦 Seeding TREASURY ACCOUNTS...')
  const accts = [
    { name: 'Bancolombia Ahorros', type: 'BANK', bank_name: 'Bancolombia', account_number: '12345678901', balance: 185000000 },
    { name: 'Davivienda Corriente', type: 'BANK', bank_name: 'Davivienda', account_number: '98765432101', balance: 72000000 },
    { name: 'BBVA Corriente USD', type: 'BANK', bank_name: 'BBVA', account_number: '55544433201', balance: 25000 },
    { name: 'Caja Principal', type: 'CASH', bank_name: null, account_number: null, balance: 3500000 },
    { name: 'Nequi Empresarial', type: 'BANK', bank_name: 'Bancolombia', account_number: '3001234567', balance: 1200000 },
  ].map(a => ({ ...a, tenant_id: TENANT_ID }))
  return insertIfEmpty('treasury_accounts', accts, 'order=name')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDocuments(parties) {
  console.log('\n📄 Seeding DOCUMENTS...')
  const customers = parties.filter(p => p.is_customer)
  if (!customers.length) return []
  const docs = []
  for (let i = 1; i <= 20; i++) {
    const sub = rand(800000, 45000000)
    const tax = round2(sub * 0.19)
    docs.push({ doc_type: 'INVOICE', number: `FV-2026-${String(i).padStart(5,'0')}`, party_id: pick(customers).id, issue_date: spreadDate(1, 90), due_date: spreadDate(-30, -1), currency: 'COP', subtotal: sub, taxes: tax, total: sub + tax, status: pick(['DRAFT','SIGNED','SENT','ACCEPTED']) })
  }
  for (let i = 1; i <= 5; i++) {
    const sub = rand(200000, 5000000)
    const tax = round2(sub * 0.19)
    docs.push({ doc_type: 'CREDIT_NOTE', number: `NC-2026-${String(i).padStart(5,'0')}`, party_id: pick(customers).id, issue_date: spreadDate(1, 60), due_date: null, currency: 'COP', subtotal: sub, taxes: tax, total: sub + tax, status: 'ACCEPTED' })
  }
  for (let i = 1; i <= 3; i++) {
    const sub = rand(100000, 3000000)
    const tax = round2(sub * 0.19)
    docs.push({ doc_type: 'DEBIT_NOTE', number: `ND-2026-${String(i).padStart(5,'0')}`, party_id: pick(customers).id, issue_date: spreadDate(1, 45), due_date: null, currency: 'COP', subtotal: sub, taxes: tax, total: sub + tax, status: 'ACCEPTED' })
  }
  for (let i = 1; i <= 5; i++) {
    const total = rand(500000, 20000000)
    docs.push({ doc_type: 'RECEIPT', number: `RC-2026-${String(i).padStart(5,'0')}`, party_id: pick(customers).id, issue_date: spreadDate(1, 30), due_date: null, currency: 'COP', subtotal: total, taxes: 0, total, status: 'ACCEPTED' })
  }
  return insertOrFetch('documents', docs.map(d => ({ ...d, tenant_id: TENANT_ID })), 'order=number', 'tenant_id,doc_type,number')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. DOCUMENT LINES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDocumentLines(documents, products) {
  console.log('\n📝 Seeding DOCUMENT LINES...')
  if (!documents.length || !products.length) return
  const lines = []
  for (const doc of documents) {
    const n = rand(1, 5)
    for (let i = 0; i < n; i++) {
      const prod = pick(products)
      const qty = rand(1, 50)
      const price = rand(15000, 2500000)
      lines.push({ tenant_id: TENANT_ID, document_id: doc.id, product_id: prod.id, description: prod.name, qty, unit_price: price, line_total: qty * price, tax_config: { iva: 19 } })
    }
  }
  await insertIfEmpty('document_lines', lines, `document_id=eq.${documents[0].id}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PURCHASE ORDERS + LINES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPurchaseOrders(parties, products, warehouses) {
  console.log('\n🛒 Seeding PURCHASE ORDERS...')
  const vendors = parties.filter(p => p.is_vendor)
  if (!vendors.length || !warehouses.length) return []
  const pos = []
  for (let i = 1; i <= 12; i++) {
    const sub = rand(2000000, 80000000)
    const tax = round2(sub * 0.19)
    pos.push({ tenant_id: TENANT_ID, po_number: `OC-2026-${String(i).padStart(5,'0')}`, supplier_id: pick(vendors).id, warehouse_id: pick(warehouses).id, currency: 'COP', status: pick(['DRAFT','PENDING_APPROVAL','APPROVED','PARTIALLY_RECEIVED','RECEIVED']), order_date: spreadDate(5, 120), expected_delivery: spreadDate(-10, 10), subtotal: sub, tax_total: tax, total: sub + tax, notes: `Orden de compra #${i}`, created_by: ADMIN_USER })
  }
  const inserted = await insertOrFetch('purchase_orders', pos, 'order=po_number', 'tenant_id,po_number')
  const lines = []
  for (const po of inserted) {
    for (let j = 0; j < rand(2, 6); j++) {
      const prod = pick(products.filter(p => p.type === 'GOOD'))
      if (!prod) continue
      const qty = rand(10, 200)
      lines.push({ order_id: po.id, product_id: prod.id, qty, unit_cost: rand(5000, 800000), tax_rate: 0.19, qty_received: po.status === 'RECEIVED' ? qty : po.status === 'PARTIALLY_RECEIVED' ? rand(1, qty - 1) : 0 })
    }
  }
  if (lines.length) await insertIfEmpty('purchase_order_lines', lines, `order_id=eq.${inserted[0].id}`)
  return inserted
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. INVENTORY MOVEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedInventoryMovements(products, warehouses) {
  console.log('\n📦 Seeding INVENTORY MOVEMENTS...')
  const goods = products.filter(p => p.type === 'GOOD')
  if (!goods.length || !warehouses.length) return
  const moves = []
  for (let i = 0; i < 50; i++) {
    moves.push({ tenant_id: TENANT_ID, warehouse_id: pick(warehouses).id, product_id: pick(goods).id, type: pick(['IN','IN','IN','OUT','OUT','TRANSFER']), qty: rand(5, 200), cost: rand(5000, 500000), ref_doc_type: 'PURCHASE_ORDER', occurred_at: spreadTs(1, 120) })
  }
  await insertIfEmpty('inventory_movements', moves, 'limit=1')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. PRODUCT LOTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProductLots(products, warehouses) {
  console.log('\n🏷 Seeding PRODUCT LOTS...')
  const goods = products.filter(p => p.type === 'GOOD' && !p.is_fixed_asset)
  if (!goods.length || !warehouses.length) return []
  const lots = []
  for (let i = 1; i <= 18; i++) {
    const mfg = spreadDate(60, 180)
    const exp = new Date(mfg); exp.setMonth(exp.getMonth() + rand(6, 24))
    lots.push({ tenant_id: TENANT_ID, product_id: pick(goods).id, warehouse_id: pick(warehouses).id, lot_number: `LOT-${String(i).padStart(4,'0')}`, batch_code: `BC${rand(1000,9999)}`, qty: rand(10, 500), cost: rand(8000, 300000), manufacture_date: mfg, expiration_date: exp.toISOString().split('T')[0], status: pick(['ACTIVE','ACTIVE','ACTIVE','QUARANTINE']) })
  }
  return insertOrFetch('product_lots', lots, 'order=lot_number', 'tenant_id,product_id,warehouse_id,lot_number')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. PRODUCT SERIALS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProductSerials(products, warehouses) {
  console.log('\n🔢 Seeding PRODUCT SERIALS...')
  const serialProds = products.filter(p => p.track_serials)
  if (!serialProds.length || !warehouses.length) return
  const serials = []
  for (const prod of serialProds) {
    for (let i = 1; i <= 3; i++) {
      serials.push({ tenant_id: TENANT_ID, product_id: prod.id, warehouse_id: pick(warehouses).id, serial_number: `SN-${prod.sku}-${String(i).padStart(3,'0')}`, status: pick(['AVAILABLE','AVAILABLE','SOLD','RESERVED']) })
    }
  }
  if (serials.length) await insert('product_serials', serials, 'tenant_id,product_id,serial_number')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. WAREHOUSE LOCATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedWarehouseLocations(warehouses) {
  console.log('\n📍 Seeding WAREHOUSE LOCATIONS...')
  if (!warehouses.length) return
  const locs = []
  for (const aisle of ['A','B','C','D']) {
    for (let shelf = 1; shelf <= 4; shelf++) {
      for (let pos = 1; pos <= 3; pos++) {
        locs.push({ warehouse_id: warehouses[0].id, aisle, rack: String(shelf), position: String(pos), capacity: rand(50, 200), is_active: true })
      }
    }
  }
  await insertIfEmpty('warehouse_locations', locs, `warehouse_id=eq.${warehouses[0].id}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14-16. LEADS + CRM OPPORTUNITIES + ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedLeads() {
  console.log('\n🎯 Seeding LEADS...')
  const leads = [
    { name: 'Dr. Roberto Mendez', company_name: 'Clinica VetPlus Bucaramanga', email: 'rmendez@vetplus.co', phone: '+573171234567', status: 'NEW', source: 'WEBSITE' },
    { name: 'Ing. Patricia Gallo', company_name: 'Avicola del Norte S.A', email: 'pgallo@aviconorte.co', phone: '+573172345678', status: 'CONTACTED', source: 'REFERRAL' },
    { name: 'Dr. Hernando Quijano', company_name: 'Zoocriadero Orinoquia', email: 'hquijano@orinoquia.co', phone: '+573173456789', status: 'QUALIFIED', source: 'TRADE_SHOW' },
    { name: 'Dra. Claudia Suarez', company_name: 'Pet Care Medellin', email: 'csuarez@petcare.co', phone: '+573174567890', status: 'NEW', source: 'LINKEDIN' },
    { name: 'Jose Luis Bermudez', company_name: 'Hacienda El Carmen', email: 'jlbermudez@elcarmen.co', phone: '+573175678901', status: 'CONTACTED', source: 'COLD_CALL' },
    { name: 'Ana Maria Quintero', company_name: 'Laboratorio VetLab Pereira', email: 'aquintero@vetlab.co', phone: '+573176789012', status: 'QUALIFIED', source: 'WEBSITE' },
    { name: 'Dr. Fabian Escobar', company_name: 'Centro Equino Armenia', email: 'fescobar@centroequino.co', phone: '+573177890123', status: 'LOST', source: 'REFERRAL' },
    { name: 'Marcela Duarte', company_name: 'Piscicola del Huila', email: 'mduarte@piscihuila.co', phone: '+573178901234', status: 'NEW', source: 'TRADE_SHOW' },
    { name: 'Ricardo Torres', company_name: 'Ganaderia Monteria Org.', email: 'rtorres@ganamonteria.co', phone: '+573179012345', status: 'CONVERTED', source: 'REFERRAL' },
    { name: 'Sandra Pedraza', company_name: 'VetShop Online', email: 'spedraza@vetshoponline.co', phone: '+573180123456', status: 'CONTACTED', source: 'WEBSITE' },
    { name: 'Alejandro Castillo', company_name: 'Cunicultura Boyaca', email: 'acastillo@cuniboyaca.co', phone: '+573181234567', status: 'NEW', source: 'LINKEDIN' },
    { name: 'Lorena Paez', company_name: 'Mascotas Premium SAS', email: 'lpaez@mascotaspremium.co', phone: '+573182345678', status: 'QUALIFIED', source: 'COLD_CALL' },
  ].map(l => ({ ...l, tenant_id: TENANT_ID, notes: `Lead captado por canal ${l.source}` }))
  return insertIfEmpty('leads', leads, 'order=name')
}

async function seedOpportunities(parties, leads) {
  console.log('\n💰 Seeding CRM OPPORTUNITIES...')
  const customers = parties.filter(p => p.is_customer)
  if (!customers.length) return []
  const opps = [
    { name: 'Contrato anual suministro Clinica VetRoble', value: 120000000, probability: 80, stage: 'NEGOTIATION' },
    { name: 'Equipamiento laboratorio UNAL', value: 85000000, probability: 60, stage: 'PROPOSAL' },
    { name: 'Vacunacion masiva Avicola del Valle', value: 45000000, probability: 90, stage: 'CLOSED_WON' },
    { name: 'Suministro anual Zoologico de Cali', value: 200000000, probability: 40, stage: 'QUALIFICATION' },
    { name: 'Programa sanitario Hacienda Bonanza', value: 35000000, probability: 70, stage: 'PROPOSAL' },
    { name: 'Kit diagnostico Centro Canino Bogota', value: 18000000, probability: 95, stage: 'CLOSED_WON' },
    { name: 'Medicamentos acuicultura Caribe', value: 55000000, probability: 30, stage: 'PROSPECTING' },
    { name: 'Equipos cirugia PetShop Colombia', value: 92000000, probability: 50, stage: 'QUALIFICATION' },
    { name: 'Programa nutricion Porcicola Santa Rosa', value: 67000000, probability: 10, stage: 'CLOSED_LOST' },
    { name: 'Suministro mensual Equinos del Llano', value: 28000000, probability: 85, stage: 'NEGOTIATION' },
  ].map((o, i) => ({ ...o, tenant_id: TENANT_ID, description: `Oportunidad comercial: ${o.name}`, expected_close_date: spreadDate(-30, 60), party_id: customers[i % customers.length].id, lead_id: leads.length > i ? leads[i].id : null }))
  return insertIfEmpty('crm_opportunities', opps, 'order=name')
}

async function seedOpportunityActivities(opportunities) {
  console.log('\n📞 Seeding CRM ACTIVITIES...')
  if (!opportunities.length) return
  const activities = []
  for (const opp of opportunities) {
    for (let i = 0; i < rand(1, 4); i++) {
      const type = pick(['NOTE','CALL','EMAIL','MEETING','STAGE_CHANGE'])
      activities.push({ tenant_id: TENANT_ID, opportunity_id: opp.id, type, title: type === 'CALL' ? 'Llamada de seguimiento' : type === 'EMAIL' ? 'Email con propuesta' : type === 'MEETING' ? 'Reunion presencial' : type === 'STAGE_CHANGE' ? 'Cambio de etapa' : 'Nota interna', description: `Actividad para ${opp.name}`, created_at: spreadTs(1, 60) })
    }
  }
  await insertIfEmpty('crm_opportunity_activities', activities, `opportunity_id=eq.${opportunities[0].id}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 17. TREASURY TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedTreasuryTransactions(accounts, parties) {
  console.log('\n💳 Seeding TREASURY TRANSACTIONS...')
  if (!accounts.length) return
  const txns = []
  for (let i = 0; i < 25; i++) {
    const type = pick(['INCOME','INCOME','EXPENSE','EXPENSE','TRANSFER'])
    txns.push({ tenant_id: TENANT_ID, account_id: pick(accounts).id, type, amount: rand(500000, 35000000), description: type === 'INCOME' ? `Recaudo factura cliente #${rand(1,20)}` : type === 'EXPENSE' ? `Pago proveedor OC-${rand(1,12)}` : 'Transferencia entre cuentas', party_id: parties.length ? pick(parties).id : null, reference_number: `REF-${rand(10000,99999)}` })
  }
  await insertIfEmpty('treasury_transactions', txns, 'limit=1')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 18. JOURNAL ENTRIES + LINES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedJournalEntries(chartAccounts, parties) {
  console.log('\n📚 Seeding JOURNAL ENTRIES...')
  if (!chartAccounts.length) return
  const entries = []
  for (let i = 1; i <= 15; i++) {
    const dt = spreadDate(1, 90)
    entries.push({ tenant_id: TENANT_ID, entry_date: dt, description: `Asiento #${i} - ${pick(['Venta mercancia','Pago nomina','Compra insumos','Depreciacion','Pago arriendo','Ajuste inventario','Recaudo cartera'])}`, number: `JE-2026-${String(i).padStart(4,'0')}`, period: dt.substring(0, 7), status: 'POSTED' })
  }
  const inserted = await insertIfEmpty('journal_entries', entries, 'order=number')
  const lines = []
  for (const je of inserted) {
    const amt = rand(500000, 25000000)
    const debitAcct = pick(chartAccounts.filter(a => a.nature === 'DEBIT'))
    const creditAcct = pick(chartAccounts.filter(a => a.nature === 'CREDIT'))
    if (debitAcct && creditAcct) {
      lines.push({ tenant_id: TENANT_ID, entry_id: je.id, account_id: debitAcct.id, debit: amt, credit: 0, description: debitAcct.name, party_id: parties.length ? pick(parties).id : null })
      lines.push({ tenant_id: TENANT_ID, entry_id: je.id, account_id: creditAcct.id, debit: 0, credit: amt, description: creditAcct.name, party_id: parties.length ? pick(parties).id : null })
    }
  }
  if (lines.length) await insertIfEmpty('journal_lines', lines, `entry_id=eq.${inserted[0].id}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 19-22. PAYROLL: SCHEDULES, GEO ZONES, KIOSK, ATTENDANCE, ABSENCES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedWorkSchedules() {
  console.log('\n⏰ Seeding WORK SCHEDULES...')
  const s = [
    { name: 'Jornada Normal', start_time: '07:00', end_time: '17:00', break_minutes: 60, grace_minutes: 10, is_night_shift: false, is_default: true },
    { name: 'Turno Manana', start_time: '06:00', end_time: '14:00', break_minutes: 30, grace_minutes: 5, is_night_shift: false, is_default: false },
    { name: 'Turno Tarde', start_time: '14:00', end_time: '22:00', break_minutes: 30, grace_minutes: 5, is_night_shift: false, is_default: false },
    { name: 'Turno Nocturno', start_time: '22:00', end_time: '06:00', break_minutes: 30, grace_minutes: 5, is_night_shift: true, is_default: false },
  ].map(x => ({ ...x, tenant_id: TENANT_ID }))
  return insertIfEmpty('work_schedules', s, 'order=name')
}

async function seedGeoZones() {
  console.log('\n🌍 Seeding GEO ZONES...')
  const z = [
    { name: 'Sede Principal Bogota', lat: 4.6486, lng: -74.0653, radius_meters: 200, is_active: true },
    { name: 'Bodega Medellin', lat: 6.2442, lng: -75.5812, radius_meters: 150, is_active: true },
    { name: 'Bodega Cali', lat: 3.4516, lng: -76.5320, radius_meters: 150, is_active: true },
  ].map(x => ({ ...x, tenant_id: TENANT_ID }))
  return insertIfEmpty('attendance_geo_zones', z, 'order=name')
}

async function seedKioskTerminals() {
  console.log('\n📱 Seeding KIOSK TERMINALS...')
  const t = [
    { name: 'Terminal Entrada Bogota', token: 'KIOSK-BOG-001-' + rand(100000, 999999), is_active: true, gps_lat: 4.6486, gps_lng: -74.0653 },
    { name: 'Terminal Bodega Medellin', token: 'KIOSK-MED-001-' + rand(100000, 999999), is_active: true, gps_lat: 6.2442, gps_lng: -75.5812 },
  ].map(x => ({ ...x, tenant_id: TENANT_ID }))
  return insertIfEmpty('kiosk_terminals', t, 'order=name')
}

async function seedAttendance(employees) {
  console.log('\n🕐 Seeding PAYROLL ATTENDANCE...')
  if (!employees.length) return
  const records = []
  for (let d = 1; d <= 20; d++) {
    const date = spreadDate(d, d)
    if ([0,6].includes(new Date(date).getDay())) continue
    for (const emp of employees.slice(0, 10)) {
      const late = rand(0, 10) > 7
      records.push({ tenant_id: TENANT_ID, employee_id: emp.id, work_date: date, check_in: `${date}T${late ? '07' : '06'}:${String(rand(0,59)).padStart(2,'0')}:00Z`, check_out: `${date}T${rand(16,18)}:${String(rand(0,59)).padStart(2,'0')}:00Z`, status: late ? 'LATE' : 'PRESENT', overtime_hours: rand(0, 2), night_hours: 0, total_worked_hours: rand(8, 10), late_minutes: late ? rand(5, 45) : 0 })
    }
  }
  await insertIfEmpty('payroll_attendance', records, 'limit=1')
}

async function seedAbsenceRequests(employees) {
  console.log('\n🏖 Seeding ABSENCE REQUESTS...')
  if (!employees.length) return
  const reqs = []
  for (let i = 0; i < 12; i++) {
    const type = pick(['VACATION','SICK_LEAVE','PERSONAL','VACATION','SICK_LEAVE','MATERNITY'])
    const days = type === 'VACATION' ? rand(5, 15) : type === 'MATERNITY' ? 126 : rand(1, 5)
    const start = spreadDate(1, 60)
    const end = new Date(start); end.setDate(end.getDate() + days)
    reqs.push({ tenant_id: TENANT_ID, employee_id: pick(employees).id, absence_type: type, start_date: start, end_date: end.toISOString().split('T')[0], days, reason: type === 'VACATION' ? 'Vacaciones programadas' : type === 'SICK_LEAVE' ? 'Incapacidad medica' : 'Permiso', status: pick(['PENDING','APPROVED','APPROVED','REJECTED']) })
  }
  await insertIfEmpty('absence_requests', reqs, 'limit=1')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 23-25. CONTRACTS, CARRIERS, SHIPMENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedContracts(parties) {
  console.log('\n📋 Seeding CONTRACTS...')
  if (!parties.length) return
  const c = [
    { title: 'Contrato suministro medicamentos veterinarios', contract_number: 'CTR-2026-001', contract_type: 'SERVICE', status: 'ACTIVE', value: 180000000 },
    { title: 'Arrendamiento bodega Medellin', contract_number: 'CTR-2026-002', contract_type: 'LEASE', status: 'ACTIVE', value: 96000000 },
    { title: 'Contrato distribucion exclusiva Zoetis', contract_number: 'CTR-2026-003', contract_type: 'PURCHASE', status: 'ACTIVE', value: 450000000 },
    { title: 'Consultoria implementacion BPM', contract_number: 'CTR-2026-004', contract_type: 'CONSULTING', status: 'ACTIVE', value: 35000000 },
    { title: 'Mantenimiento equipos laboratorio', contract_number: 'CTR-2026-005', contract_type: 'SERVICE', status: 'ACTIVE', value: 24000000 },
    { title: 'Contrato temporal epoca alta', contract_number: 'CTR-2026-006', contract_type: 'EMPLOYMENT', status: 'EXPIRED', value: 12000000 },
    { title: 'Servicio transporte refrigerado', contract_number: 'CTR-2026-007', contract_type: 'SERVICE', status: 'ACTIVE', value: 72000000 },
    { title: 'Licencia software ERP', contract_number: 'CTR-2026-008', contract_type: 'OTHER', status: 'ACTIVE', value: 18000000 },
  ].map(x => ({ ...x, tenant_id: TENANT_ID, party_id: pick(parties).id, start_date: spreadDate(30, 365), end_date: spreadDate(-180, -30), currency: 'COP', description: x.title, created_by: ADMIN_USER }))
  return insertIfEmpty('contracts', c, 'order=contract_number')
}

async function seedLogisticsCarriers() {
  console.log('\n🚚 Seeding LOGISTICS CARRIERS...')
  const c = [
    { name: 'TCC - Transportadora Comercial Colombia', nit: '860012345', contact_name: 'Carlos Pena', phone: '+576017654321', email: 'empresarial@tcc.com.co', is_active: true },
    { name: 'Servientrega S.A', nit: '860023456', contact_name: 'Ana Lopez', phone: '+576018765432', email: 'corporativo@servientrega.com', is_active: true },
    { name: 'Coordinadora Mercantil', nit: '860034567', contact_name: 'Pedro Rios', phone: '+576019876543', email: 'cuentas@coordinadora.com', is_active: true },
    { name: 'TransFrio del Valle', nit: '860045678', contact_name: 'Mario Castro', phone: '+573221234567', email: 'logistica@transfrio.co', is_active: true },
    { name: 'Envia - Colvanes', nit: '860056789', contact_name: 'Lucia Gomez', phone: '+576020123456', email: 'empresas@enviacolvanes.com', is_active: true },
  ].map(x => ({ ...x, tenant_id: TENANT_ID }))
  return insertIfEmpty('logistics_carriers', c, 'order=name')
}

async function seedLogisticsShipments(carriers, documents) {
  console.log('\n📬 Seeding LOGISTICS SHIPMENTS...')
  if (!carriers.length || !documents.length) return
  const invoices = documents.filter(d => d.doc_type === 'INVOICE')
  if (!invoices.length) return
  const s = []
  for (let i = 0; i < Math.min(8, invoices.length); i++) {
    const status = pick(['PENDING','PACKED','SHIPPED','SHIPPED','DELIVERED','DELIVERED'])
    s.push({ tenant_id: TENANT_ID, order_id: invoices[i].id, carrier_id: pick(carriers).id, tracking_number: `GVM-SHIP-${String(i+1).padStart(5,'0')}`, status, notes: `Envio #${i+1} - ${pick(['Bogota','Medellin','Cali','Barranquilla'])}`, shipped_at: ['SHIPPED','DELIVERED'].includes(status) ? spreadTs(1, 30) : null, delivered_at: status === 'DELIVERED' ? spreadTs(1, 10) : null, freight_cost: rand(50000, 500000) })
  }
  await insertIfEmpty('logistics_shipments', s, 'limit=1')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 26-28. QUALITY + EQUIPMENT + MAINTENANCE
// NOTE: quality_inspections, quality_ncrs, equipment, maintenance_orders tables
// do not exist in this deployment. These seed functions are intentionally omitted.
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 29. SUPPORT TICKETS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSupportTickets(parties) {
  console.log('\n🎫 Seeding SUPPORT TICKETS...')
  const customers = parties.filter(p => p.is_customer)
  if (!customers.length) return
  const tickets = [
    { number: 'TKT-2026-001', subject: 'Producto recibido danado', category: 'RMA', priority: 'HIGH', status: 'RESOLVED' },
    { number: 'TKT-2026-002', subject: 'Error en factura - precio incorrecto', category: 'BILLING', priority: 'MEDIUM', status: 'CLOSED' },
    { number: 'TKT-2026-003', subject: 'Demora en entrega pedido', category: 'LOGISTICS', priority: 'HIGH', status: 'IN_PROGRESS' },
    { number: 'TKT-2026-004', subject: 'Solicitud certificado retencion', category: 'BILLING', priority: 'LOW', status: 'OPEN' },
    { number: 'TKT-2026-005', subject: 'Producto con fecha proxima a vencer', category: 'TECHNICAL', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    { number: 'TKT-2026-006', subject: 'Devolucion parcial exceso pedido', category: 'RMA', priority: 'MEDIUM', status: 'RESOLVED' },
    { number: 'TKT-2026-007', subject: 'Consulta disponibilidad vacuna aftosa', category: 'TECHNICAL', priority: 'LOW', status: 'CLOSED' },
    { number: 'TKT-2026-008', subject: 'Falla cadena de frio en transporte', category: 'LOGISTICS', priority: 'CRITICAL', status: 'OPEN' },
  ].map(t => ({ ...t, tenant_id: TENANT_ID, party_id: pick(customers).id, description: t.subject }))
  await insertIfEmpty('support_tickets', tickets, 'limit=1')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 30. DIAN
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDIAN(documents) {
  console.log('\n🏛 Seeding DIAN...')
  await insert('dian_config', [{ tenant_id: TENANT_ID, software_id: 'aaaa-bbbb-cccc-dddd', pin: '12345', technical_key: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38571c', environment: 'TEST' }], 'tenant_id')
  await insertIfEmpty('dian_resolutions', [
    { tenant_id: TENANT_ID, prefix: 'FV', resolution_number: '18764000001234', resolution_date: '2025-01-15', valid_from: '2025-01-15', valid_until: '2026-12-31', from_number: 1, to_number: 5000, current_number: 33, doc_type: 'INVOICE', status: 'ACTIVE' },
    { tenant_id: TENANT_ID, prefix: 'NC', resolution_number: '18764000005678', resolution_date: '2025-01-15', valid_from: '2025-01-15', valid_until: '2026-12-31', from_number: 1, to_number: 2000, current_number: 5, doc_type: 'CREDIT_NOTE', status: 'ACTIVE' },
  ], 'limit=1')
  const invoices = documents.filter(d => d.doc_type === 'INVOICE').slice(0, 5)
  if (invoices.length) {
    const eDocs = invoices.map((inv, i) => ({ tenant_id: TENANT_ID, document_id: inv.id, environment: 'TEST', cufe: `cufe${String(i+1).padStart(3,'0')}${'a'.repeat(60)}`, qr_data: `NumFac: ${inv.number}`, dian_status: i < 3 ? 'ACCEPTED' : 'PENDING', xml_content: `<Invoice><ID>${inv.number}</ID></Invoice>` }))
    await insert('electronic_documents', eDocs, 'document_id')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 31-34. CONFIG: DIMENSIONS, CURRENCIES, PRICE LISTS, FIXED ASSETS, FISCAL
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDimensions() {
  console.log('\n📐 Seeding DIMENSIONS...')
  const dims = [
    { code: 'CC', name: 'Centro de Costo', is_active: true },
    { code: 'PROY', name: 'Proyecto', is_active: true },
  ].map(d => ({ ...d, tenant_id: TENANT_ID }))
  const inserted = await insertOrFetch('dimensions', dims, 'order=code', 'tenant_id,code')
  if (!inserted.length) return
  const cc = inserted.find(d => d.code === 'CC')
  const proj = inserted.find(d => d.code === 'PROY')
  const vals = []
  if (cc) { vals.push({ dimension_id: cc.id, code: 'ADM', name: 'Administracion' }, { dimension_id: cc.id, code: 'COM', name: 'Comercial' }, { dimension_id: cc.id, code: 'LOG', name: 'Logistica' }, { dimension_id: cc.id, code: 'LAB', name: 'Laboratorio' }) }
  if (proj) { vals.push({ dimension_id: proj.id, code: 'VAC-2026', name: 'Campana Vacunacion 2026' }, { dimension_id: proj.id, code: 'EXP-CAR', name: 'Expansion Caribe' }, { dimension_id: proj.id, code: 'BPM-IMP', name: 'Implementacion BPM' }) }
  if (vals.length) await insert('dimension_values', vals.map(v => ({ ...v, tenant_id: TENANT_ID, is_active: true })), 'dimension_id,code')
}

async function seedCurrencies() {
  console.log('\n💱 Seeding CURRENCIES...')
  await insert('currencies', [
    { code: 'COP', name: 'Peso Colombiano', symbol: '$', decimal_places: 0 },
    { code: 'USD', name: 'Dolar Estadounidense', symbol: 'US$', decimal_places: 2 },
    { code: 'EUR', name: 'Euro', symbol: 'E', decimal_places: 2 },
    { code: 'BRL', name: 'Real Brasileno', symbol: 'R$', decimal_places: 2 },
    { code: 'MXN', name: 'Peso Mexicano', symbol: 'MX$', decimal_places: 2 },
  ], 'code')
  await insert('exchange_rates', [
    { tenant_id: TENANT_ID, from_currency: 'USD', to_currency: 'COP', rate: 4150.50, effective_date: '2026-03-01' },
    { tenant_id: TENANT_ID, from_currency: 'EUR', to_currency: 'COP', rate: 4520.30, effective_date: '2026-03-01' },
    { tenant_id: TENANT_ID, from_currency: 'USD', to_currency: 'COP', rate: 4180.75, effective_date: '2026-03-15' },
    { tenant_id: TENANT_ID, from_currency: 'EUR', to_currency: 'COP', rate: 4545.00, effective_date: '2026-03-15' },
    { tenant_id: TENANT_ID, from_currency: 'BRL', to_currency: 'COP', rate: 720.50, effective_date: '2026-03-01' },
  ], 'tenant_id,from_currency,to_currency,effective_date')
}

async function seedPriceLists(products) {
  console.log('\n💲 Seeding PRICE LISTS...')
  const lists = [
    { name: 'Lista General', currency: 'COP', valid_from: '2026-01-01', valid_to: '2026-12-31', is_default: true },
    { name: 'Lista Distribuidores', currency: 'COP', valid_from: '2026-01-01', valid_to: '2026-12-31', is_default: false },
    { name: 'Lista Exportacion USD', currency: 'USD', valid_from: '2026-01-01', valid_to: '2026-12-31', is_default: false },
  ].map(l => ({ ...l, tenant_id: TENANT_ID }))
  const inserted = await insertIfEmpty('price_lists', lists, 'order=name')
  if (!inserted.length || !products.length) return
  const items = []
  for (const pl of inserted) {
    for (const prod of products.slice(0, 15)) {
      const base = rand(15000, 2500000)
      items.push({ tenant_id: TENANT_ID, price_list_id: pl.id, product_id: prod.id, unit_price: pl.name.includes('Distribuidores') ? round2(base * 0.85) : pl.name.includes('USD') ? round2(base / 4150) : base, min_qty: 1 })
    }
  }
  await insert('price_list_items', items, 'price_list_id,product_id,min_qty')
}

async function seedFixedAssets() {
  console.log('\n🏢 Seeding FIXED ASSETS...')
  const assets = [
    { code: 'AF-001', name: 'Ecografo Veterinario Portatil', category: 'EQUIPMENT', acquisition_date: '2023-06-15', acquisition_cost: 45000000, useful_life_years: 10, salvage_value: 4500000, location: 'Bogota - Lab', serial_number: 'ECO-2023-001', notes: 'Equipo de diagnostico' },
    { code: 'AF-002', name: 'Mesa de Cirugia Veterinaria', category: 'FURNITURE', acquisition_date: '2024-01-20', acquisition_cost: 18000000, useful_life_years: 10, salvage_value: 1800000, location: 'Bogota - Quirofano', serial_number: 'MCV-2024-001', notes: 'Mesa quirurgica acero inox' },
    { code: 'AF-003', name: 'Autoclave 20L Digital', category: 'EQUIPMENT', acquisition_date: '2023-03-10', acquisition_cost: 12000000, useful_life_years: 5, salvage_value: 1200000, location: 'Bogota - Esterilizacion', serial_number: 'AUT-2023-001', notes: 'Autoclave de vapor' },
    { code: 'AF-004', name: 'Microscopio Binocular LED', category: 'COMPUTER', acquisition_date: '2024-06-01', acquisition_cost: 8500000, useful_life_years: 5, salvage_value: 850000, location: 'Bogota - Lab', serial_number: 'MIC-2024-001', notes: 'Microscopio para diagnostico' },
    { code: 'AF-005', name: 'Vehiculo Furgon Refrigerado', category: 'VEHICLE', acquisition_date: '2020-12-01', acquisition_cost: 350000000, useful_life_years: 20, salvage_value: 35000000, location: 'Bogota - Flota', serial_number: 'VFR-2020-001', notes: 'Transporte cadena de frio' },
  ].map(a => ({ ...a, tenant_id: TENANT_ID, status: 'ACTIVE', accumulated_depreciation: 0 }))
  await insertIfEmpty('fixed_assets', assets, 'order=code')
}

async function seedFiscalPeriods() {
  console.log('\n📅 Seeding FISCAL PERIODS...')
  const periods = []
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0')
    periods.push({ tenant_id: TENANT_ID, period: `2026-${mm}`, status: m <= 2 ? 'CLOSED' : 'OPEN' })
  }
  await insert('fiscal_periods', periods, 'tenant_id,period')
}

async function seedRecurringInvoices(parties) {
  console.log('\n🔄 Seeding RECURRING INVOICES...')
  const customers = parties.filter(p => p.is_customer)
  if (!customers.length) return
  await insertIfEmpty('recurring_invoices', [
    { tenant_id: TENANT_ID, name: 'Suministro mensual medicamentos', party_id: customers[0].id, frequency: 'MONTHLY', next_run_date: '2026-04-01', status: 'ACTIVE', currency: 'COP', lines: [{ description: 'Suministro mensual medicamentos', qty: 1, unit_price: 15000000, line_total: 15000000 }], created_by: ADMIN_USER },
    { tenant_id: TENANT_ID, name: 'Contrato trimestral insumos', party_id: customers[1].id, frequency: 'QUARTERLY', next_run_date: '2026-04-01', status: 'ACTIVE', currency: 'COP', lines: [{ description: 'Contrato trimestral insumos', qty: 1, unit_price: 45000000, line_total: 45000000 }], created_by: ADMIN_USER },
    { tenant_id: TENANT_ID, name: 'Asistencia tecnica mensual', party_id: customers[2].id, frequency: 'MONTHLY', next_run_date: '2026-04-01', status: 'ACTIVE', currency: 'COP', lines: [{ description: 'Asistencia tecnica mensual', qty: 1, unit_price: 8500000, line_total: 8500000 }], created_by: ADMIN_USER },
  ], 'limit=1')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 35-38. TRAINING, IT ASSETS, PETTY CASH, CHAT, NOTIFICATIONS, TRANSFERS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedTraining(employees) {
  console.log('\n🎓 Seeding TRAINING...')
  const programs = [
    { code: 'BPA-001', name: 'Buenas Practicas de Almacenamiento', description: 'Formacion en BPA', category: 'COMPLIANCE', duration_hours: 16, is_mandatory: true },
    { code: 'SST-001', name: 'Seguridad y Salud en el Trabajo', description: 'Programa anual SST', category: 'SAFETY', duration_hours: 20, is_mandatory: true },
    { code: 'QC-001', name: 'Control de Calidad Veterinario', description: 'Protocolo sustancias controladas', category: 'QUALITY', duration_hours: 8, is_mandatory: true },
    { code: 'MGT-001', name: 'Liderazgo y Gestion de Equipos', description: 'Comunicacion efectiva', category: 'MANAGEMENT', duration_hours: 12, is_mandatory: false },
    { code: 'TECH-001', name: 'Excel Avanzado para Reportes', description: 'Tablas dinamicas', category: 'TECHNICAL', duration_hours: 24, is_mandatory: false },
  ].map(p => ({ ...p, tenant_id: TENANT_ID }))
  const ins = await insertIfEmpty('training_programs', programs, 'order=name')
  if (!ins.length || !employees.length) return
  const recs = []
  for (const prog of ins) {
    for (let i = 0; i < rand(3, 6); i++) {
      const done = rand(0, 10) > 3
      recs.push({ tenant_id: TENANT_ID, program_id: prog.id, employee_id: pick(employees).id, status: done ? 'COMPLETED' : 'SCHEDULED', score: done ? rand(70, 100) : null, scheduled_date: spreadDate(10, 90), completion_date: done ? spreadDate(1, 10) : null })
    }
  }
  await insertIfEmpty('training_records', recs, `program_id=eq.${ins[0].id}`)
}

async function seedITAssets() {
  console.log('\n💻 Seeding IT ASSETS...')
  const assets = [
    { name: 'Laptop Dell Latitude 5540', asset_code: 'IT-LAP-001', category: 'LAPTOP', status: 'ASSIGNED', condition: 'GOOD', serial_number: 'DL5540-001', brand: 'Dell', model: 'Latitude 5540', purchase_date: '2024-03-15', purchase_cost: 4500000, warranty_expiry: '2027-03-15' },
    { name: 'Laptop Dell Latitude 5540', asset_code: 'IT-LAP-002', category: 'LAPTOP', status: 'ASSIGNED', condition: 'GOOD', serial_number: 'DL5540-002', brand: 'Dell', model: 'Latitude 5540', purchase_date: '2024-03-15', purchase_cost: 4500000, warranty_expiry: '2027-03-15' },
    { name: 'Laptop Lenovo ThinkPad T14', asset_code: 'IT-LAP-003', category: 'LAPTOP', status: 'AVAILABLE', condition: 'NEW', serial_number: 'LT14-001', brand: 'Lenovo', model: 'ThinkPad T14', purchase_date: '2025-11-01', purchase_cost: 5200000, warranty_expiry: '2028-11-01' },
    { name: 'Desktop HP ProDesk 400', asset_code: 'IT-DES-001', category: 'DESKTOP', status: 'ASSIGNED', condition: 'GOOD', serial_number: 'HP400-001', brand: 'HP', model: 'ProDesk 400 G9', purchase_date: '2023-09-10', purchase_cost: 3200000, warranty_expiry: '2026-09-10' },
    { name: 'Desktop HP ProDesk 400', asset_code: 'IT-DES-002', category: 'DESKTOP', status: 'ASSIGNED', condition: 'FAIR', serial_number: 'HP400-002', brand: 'HP', model: 'ProDesk 400 G9', purchase_date: '2023-09-10', purchase_cost: 3200000, warranty_expiry: '2026-09-10' },
    { name: 'Impresora HP LaserJet Pro', asset_code: 'IT-PRT-001', category: 'PRINTER', status: 'ASSIGNED', condition: 'GOOD', serial_number: 'HPLJ-001', brand: 'HP', model: 'LaserJet Pro M428', purchase_date: '2024-01-20', purchase_cost: 1800000, warranty_expiry: '2026-01-20' },
    { name: 'Switch Cisco 24 puertos', asset_code: 'IT-NET-001', category: 'NETWORK', status: 'ASSIGNED', condition: 'GOOD', serial_number: 'CISCO-001', brand: 'Cisco', model: 'CBS250-24T', purchase_date: '2023-06-15', purchase_cost: 2100000, warranty_expiry: '2026-06-15' },
    { name: 'Samsung Galaxy A54', asset_code: 'IT-MOB-001', category: 'MOBILE', status: 'ASSIGNED', condition: 'GOOD', serial_number: 'SGA54-001', brand: 'Samsung', model: 'Galaxy A54', purchase_date: '2025-02-01', purchase_cost: 1600000, warranty_expiry: '2027-02-01' },
  ].map(a => ({ ...a, tenant_id: TENANT_ID, notes: a.name }))
  await insertIfEmpty('it_assets', assets, 'order=asset_code')
}

async function seedPettyCash() {
  console.log('\n💵 Seeding PETTY CASH...')
  const funds = await insertIfEmpty('petty_cash_funds', [
    { tenant_id: TENANT_ID, name: 'Caja Menor Oficina Bogota', custodian_id: ADMIN_USER, max_amount: 2000000, current_balance: 1350000, status: 'ACTIVE' },
    { tenant_id: TENANT_ID, name: 'Caja Menor Bodega', custodian_id: ADMIN_USER, max_amount: 1000000, current_balance: 720000, status: 'ACTIVE' },
  ], 'order=name')
  if (!funds.length) return
  const txns = []
  for (const fund of funds) {
    for (let i = 0; i < 8; i++) {
      txns.push({ tenant_id: TENANT_ID, fund_id: fund.id, type: 'EXPENSE', amount: rand(15000, 180000), description: pick(['Papeleria','Transporte','Refrigerios','Fotocopias','Taxi','Aseo','Parqueadero','Domicilio']), expense_category: pick(['OFFICE','TRANSPORT','FOOD','SUPPLIES','OTHER']), receipt_number: `REC-${rand(1000,9999)}`, created_by: ADMIN_USER })
    }
  }
  await insertIfEmpty('petty_cash_transactions', txns, `fund_id=eq.${funds[0].id}`)
}

async function seedChatChannels() {
  console.log('\n💬 Seeding CHAT CHANNELS...')
  await insertIfEmpty('chat_channels', [
    { tenant_id: TENANT_ID, name: 'General', description: 'Canal general de la empresa', type: 'public', created_by: ADMIN_USER },
    { tenant_id: TENANT_ID, name: 'Ventas', description: 'Coordinacion equipo comercial', type: 'public', created_by: ADMIN_USER },
    { tenant_id: TENANT_ID, name: 'Logistica', description: 'Coordinacion despachos', type: 'public', created_by: ADMIN_USER },
    { tenant_id: TENANT_ID, name: 'Gerencia', description: 'Canal privado direccion', type: 'private', created_by: ADMIN_USER },
  ], 'order=name')
}

async function seedNotifications() {
  console.log('\n🔔 Seeding NOTIFICATIONS...')
  await insertIfEmpty('app_notifications', [
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'ALERT', title: 'Lote proximo a vencer', message: 'El lote LOT-0003 de Ivermectina vence en 15 dias', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'INFO', title: 'Nuevo pedido recibido', message: 'Se ha recibido la OC-2026-00008 del proveedor Zoetis', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'WARNING', title: 'Stock bajo', message: 'Amoxicilina 500mg tiene stock por debajo del minimo', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'INFO', title: 'Factura aceptada DIAN', message: 'FV-2026-00012 aceptada exitosamente', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'ALERT', title: 'Contrato proximo a vencer', message: 'CTR-2026-006 vence en 30 dias', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'WARNING', title: 'Mantenimiento pendiente', message: 'Compresor Cuarto Frio tiene mantenimiento programado', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'INFO', title: 'Capacitacion completada', message: 'Carlos Martinez completo BPA', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'ALERT', title: 'Ticket critico', message: 'Falla cadena de frio en transporte', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'INFO', title: 'Nomina liquidada', message: 'Nomina 2026-03 liquidada exitosamente', created_at: spreadTs(1, 5) },
    { tenant_id: TENANT_ID, user_id: ADMIN_USER, type: 'WARNING', title: 'Presupuesto excedido', message: 'CC Logistica supero 90% del presupuesto', created_at: spreadTs(1, 5) },
  ], 'limit=1')
}

async function seedWarehouseTransfers(warehouses, products) {
  console.log('\n🔀 Seeding WAREHOUSE TRANSFERS...')
  if (warehouses.length < 2 || !products.length) return
  const transfers = await insertIfEmpty('warehouse_transfers', [
    { tenant_id: TENANT_ID, transfer_number: 'TR-2026-00001', from_warehouse_id: warehouses[0].id, to_warehouse_id: warehouses[1].id, status: 'RECEIVED', notes: 'Traslado mensual a Medellin', transferred_by: ADMIN_USER },
    { tenant_id: TENANT_ID, transfer_number: 'TR-2026-00002', from_warehouse_id: warehouses[0].id, to_warehouse_id: warehouses[2].id, status: 'IN_TRANSIT', notes: 'Envio vacunas a Cali', transferred_by: ADMIN_USER },
    { tenant_id: TENANT_ID, transfer_number: 'TR-2026-00003', from_warehouse_id: warehouses[1].id, to_warehouse_id: warehouses[0].id, status: 'DRAFT', notes: 'Devolucion insumos sobrantes', transferred_by: ADMIN_USER },
  ], 'order=transfer_number')
  if (!transfers.length) return
  const goods = products.filter(p => p.type === 'GOOD')
  const lines = []
  for (const tr of transfers) {
    for (let i = 0; i < rand(2, 5); i++) lines.push({ transfer_id: tr.id, product_id: pick(goods).id, qty: rand(5, 100) })
  }
  await insertIfEmpty('warehouse_transfer_lines', lines, `transfer_id=eq.${transfers[0].id}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function safeRun(label, fn) {
  try { return await fn() } catch (err) { console.error(`  [SKIP] ${label}: ${err.message}`); return null }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║  GVM Corporation S.A.S — Seed Demo Data (COMPLETO)         ║')
  console.log('║  43 modules | Tenant:', TENANT_ID, '║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  // Phase 1: Base catalog
  const parties       = await safeRun('parties', seedParties) || []
  const products      = await safeRun('products', seedProducts) || []
  const warehouses    = await safeRun('warehouses', seedWarehouses) || []
  const employees     = await safeRun('employees', seedEmployees) || []
  const chartAccts    = await safeRun('chart_accounts', seedChartAccounts) || []
  const treasuryAccts = await safeRun('treasury_accounts', seedTreasuryAccounts) || []

  // Phase 2: Sales & Purchasing
  const documents = await safeRun('documents', () => seedDocuments(parties)) || []
  await safeRun('document_lines', () => seedDocumentLines(documents, products))
  await safeRun('purchase_orders', () => seedPurchaseOrders(parties, products, warehouses))

  // Phase 3: Inventory
  await safeRun('inventory_movements', () => seedInventoryMovements(products, warehouses))
  await safeRun('product_lots', () => seedProductLots(products, warehouses))
  await safeRun('product_serials', () => seedProductSerials(products, warehouses))
  await safeRun('warehouse_locations', () => seedWarehouseLocations(warehouses))
  await safeRun('warehouse_transfers', () => seedWarehouseTransfers(warehouses, products))

  // Phase 4: CRM
  const leads = await safeRun('leads', seedLeads) || []
  const opps  = await safeRun('opportunities', () => seedOpportunities(parties, leads)) || []
  await safeRun('crm_activities', () => seedOpportunityActivities(opps))

  // Phase 5: Finance
  await safeRun('treasury_txns', () => seedTreasuryTransactions(treasuryAccts, parties))
  await safeRun('journal_entries', () => seedJournalEntries(chartAccts, parties))
  await safeRun('fixed_assets', seedFixedAssets)
  await safeRun('fiscal_periods', seedFiscalPeriods)
  await safeRun('recurring_invoices', () => seedRecurringInvoices(parties))
  await safeRun('petty_cash', seedPettyCash)
  await safeRun('currencies', seedCurrencies)
  await safeRun('dimensions', seedDimensions)
  await safeRun('price_lists', () => seedPriceLists(products))

  // Phase 6: Payroll & HR
  await safeRun('work_schedules', seedWorkSchedules)
  await safeRun('geo_zones', seedGeoZones)
  await safeRun('kiosk_terminals', seedKioskTerminals)
  await safeRun('attendance', () => seedAttendance(employees))
  await safeRun('absences', () => seedAbsenceRequests(employees))
  await safeRun('training', () => seedTraining(employees))

  // Phase 7: Operations
  await safeRun('support_tickets', () => seedSupportTickets(parties))
  const carriers = await safeRun('carriers', seedLogisticsCarriers) || []
  await safeRun('shipments', () => seedLogisticsShipments(carriers, documents))
  await safeRun('contracts', () => seedContracts(parties))

  // Phase 8: Config & Comms
  await safeRun('dian', () => seedDIAN(documents))
  await safeRun('it_assets', seedITAssets)
  await safeRun('chat_channels', seedChatChannels)
  await safeRun('notifications', seedNotifications)

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║  RESUMEN FINAL                                               ║')
  console.log('╠══════════════════════════════════════════════════════════════╣')
  let total = 0
  for (const [t, c] of Object.entries(summary).sort()) {
    console.log(`║  ${t.padEnd(38)}${String(c).padStart(5)} filas  ║`)
    total += c
  }
  console.log('╠══════════════════════════════════════════════════════════════╣')
  console.log(`║  TOTAL${' '.repeat(31)}${String(total).padStart(5)} filas  ║`)
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('\nSeed completado.')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
