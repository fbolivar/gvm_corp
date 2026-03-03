// Seed script for GVM Veterinaria demo data
// Fixed: party_type (PERSON/COMPANY), document status/type enums, valid hex UUIDs
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = 'https://qoivnsnugfblfebrpifq.supabase.co';
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\n]+)/)?.[1];
const supabase = createClient(url, serviceKey);

const T = 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9';
const ADMIN = '4d529f53-df07-434d-a7b6-d3e9b3f34634';

async function ins(table, data, conflict = 'id') {
  const { error } = await supabase.from(table).upsert(data, { onConflict: conflict, ignoreDuplicates: true });
  if (error) console.error(`\u2717 ${table}: ${error.message}`);
  else console.log(`\u2713 ${table} (${Array.isArray(data) ? data.length : 1} rows)`);
}

// Valid hex UUIDs - all chars must be 0-9 or a-f
// Warehouses: b0000001-... (b is valid hex) — already inserted!
// Vendors: aa000001-... through aa00000a-...
// Customers: ab000001-... through ab000008-...
// Employee parties: ac000001-... through ac00000a-...
// Products: bb000001-... through bb00001f-...
// Employees: bc000001-... through bc00000a-...
// Treasury accounts: bd000001-... through bd000004-...
// Documents: d0000001-... through d000000a-...
// Document lines: da000001-... through da000010-...
// Treasury transactions: db000001-... through db000008-...
// Payroll periods: dc000001-... through dc000002-...
// Payroll loans: dd000001-... through dd000002-...
// Payroll benefits: de000001-... through de000005-...
// Leads: fa000001-... through fa000004-...
// CRM opportunities: fb000001-... through fb000004-...
// Support tickets: fc000001-... through fc000004-...

async function run() {
  // Proveedores — COMPANY type
  await ins('parties', [
    {id:'aa000001-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'MSD Salud Animal Colombia SAS',trade_name:'MSD Animal Health',doc_type:'NIT',doc_number:'9001234561',nit:'9001234561',dv:'1',email:'ventas.veterinaria@msd.com',phone:'(601) 7435000',is_customer:false,is_vendor:true,address:'Cra 7 # 71-21 Torre B Piso 14',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa000002-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Bayer SA Salud Animal',trade_name:'Bayer AgriSalud',doc_type:'NIT',doc_number:'8600112342',nit:'8600112342',dv:'5',email:'info.bayervet@bayer.com',phone:'(601) 4253000',is_customer:false,is_vendor:true,address:'Cra 53 # 108-50',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa000003-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Royal Canin de Colombia SAS',trade_name:'Royal Canin',doc_type:'NIT',doc_number:'9001456783',nit:'9001456783',dv:'7',email:'pedidos@royalcanin.com.co',phone:'(601) 6000100',is_customer:false,is_vendor:true,address:'Autopista Norte Km 7',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa000004-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Vecol SA',trade_name:'Vecol',doc_type:'NIT',doc_number:'8990000014',nit:'8990000014',dv:'3',email:'ventas@vecol.com.co',phone:'(601) 5423000',is_customer:false,is_vendor:true,address:'Cra 7a Bis # 132-28',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa000005-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Hills Pet Nutrition Colombia SA',trade_name:'Hills Science Diet',doc_type:'NIT',doc_number:'9001567894',nit:'9001567894',dv:'2',email:'hills.co@hillspet.com',phone:'(601) 3200200',is_customer:false,is_vendor:true,address:'Cll 100 # 8A-49 Of 1102',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa000006-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Lavet Colombia SAS',trade_name:'Lavet Lab',doc_type:'NIT',doc_number:'9001678905',nit:'9001678905',dv:'8',email:'compras@lavetcolombia.com',phone:'(601) 2340055',is_customer:false,is_vendor:true,address:'Zona Industrial Cll 17 # 33-65',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa000007-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Intramed Colombia SAS',trade_name:'Intramed',doc_type:'NIT',doc_number:'9001789016',nit:'9001789016',dv:'4',email:'pedidos@intramed.com.co',phone:'(604) 3542200',is_customer:false,is_vendor:true,address:'Cra 48 # 34-50',city:'Medellin',department:'Antioquia',country:'CO'},
    {id:'aa000008-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Purina Colombia SAS',trade_name:'Purina - Nestle',doc_type:'NIT',doc_number:'8600065898',nit:'8600065898',dv:'6',email:'servicio.cliente@nestle.com.co',phone:'(601) 5750000',is_customer:false,is_vendor:true,address:'Cll 113 # 7-80',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa000009-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Servimedico Veterinario SAS',trade_name:'ServimeVet',doc_type:'NIT',doc_number:'9001890127',nit:'9001890127',dv:'9',email:'ventas@servicovet.com',phone:'(601) 7812300',is_customer:false,is_vendor:true,address:'Cll 13 # 18-24 Local 5',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'aa00000a-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Nutraceutical Veterinary Colombia SAS',trade_name:'NutriVet',doc_type:'NIT',doc_number:'9001901238',nit:'9001901238',dv:'0',email:'info@nutrivet.com.co',phone:'(601) 9023400',is_customer:false,is_vendor:true,address:'Cra 15 # 95-45 Of 201',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'}
  ]);

  // Clientes
  await ins('parties', [
    {id:'ab000001-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Clinica Veterinaria Amigos del Parque SAS',trade_name:'VetParque',doc_type:'NIT',doc_number:'9002001231',nit:'9002001231',dv:'5',email:'contacto@vetparque.com.co',phone:'318 5001234',is_customer:true,is_vendor:false,address:'Cra 11 # 84-09',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ab000002-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Granja Avicola San Juan SAS',trade_name:'Granja San Juan',doc_type:'NIT',doc_number:'8001002342',nit:'8001002342',dv:'3',email:'gerencia@granjasanjuan.com',phone:'312 4002341',is_customer:true,is_vendor:false,address:'Km 12 Via Zipaquira',city:'Zipaquira',department:'Cundinamarca',country:'CO'},
    {id:'ab000003-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Hacienda La Esperanza SAS',trade_name:'Hacienda La Esperanza',doc_type:'NIT',doc_number:'8001103453',nit:'8001103453',dv:'7',email:'admin@haciendalae.com',phone:'310 3003452',is_customer:true,is_vendor:false,address:'Km 30 Via Villeta',city:'Villeta',department:'Cundinamarca',country:'CO'},
    {id:'ab000004-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Pet Shop Peluditos Felices SAS',trade_name:'Peluditos Felices',doc_type:'NIT',doc_number:'9002204564',nit:'9002204564',dv:'1',email:'pedidos@peluditosfelices.co',phone:'313 2004563',is_customer:true,is_vendor:false,address:'Cll 147 # 17-52',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ab000005-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Maria Lucia Garcia Perez',trade_name:null,doc_type:'CC',doc_number:'52456789',nit:null,dv:null,email:'mlgarcia@gmail.com',phone:'315 1005678',is_customer:true,is_vendor:false,address:'Cll 134 # 12-25 Apto 301',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ab000006-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Carlos Andres Perez Molina',trade_name:null,doc_type:'CC',doc_number:'79345678',nit:null,dv:null,email:'caperez@hotmail.com',phone:'317 2006789',is_customer:true,is_vendor:false,address:'Cra 7 # 55-30 Apto 502',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ab000007-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Andrea Sofia Ramirez Torres',trade_name:null,doc_type:'CC',doc_number:'1020345678',nit:null,dv:null,email:'aramirez@gmail.com',phone:'320 3007890',is_customer:true,is_vendor:false,address:'Cll 72 # 22-10 Casa 4',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ab000008-0000-0000-0000-000000000001',tenant_id:T,party_type:'COMPANY',legal_name:'Zoonosis Alcaldia de Bogota',trade_name:'UAESPNN Bogota',doc_type:'NIT',doc_number:'8990046558',nit:'8990046558',dv:'2',email:'zoonosis@bogota.gov.co',phone:'(601) 3693003',is_customer:true,is_vendor:false,address:'Cll 26 # 29-50 CAN',city:'Bogota D.C.',department:'Cundinamarca',country:'CO'}
  ]);

  // Parties para empleados
  await ins('parties', [
    {id:'ac000001-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Ana Maria Rodriguez Ospina',doc_type:'CC',doc_number:'39456781',email:'ana.rodriguez@gvmvet.com',phone:'313 4001111',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000002-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Carlos Alberto Martinez Rueda',doc_type:'CC',doc_number:'79567892',email:'carlos.martinez@gvmvet.com',phone:'315 4002222',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000003-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Luisa Fernanda Hernandez Vargas',doc_type:'CC',doc_number:'1019234563',email:'luisa.hernandez@gvmvet.com',phone:'317 4003333',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000004-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Diego Alejandro Torres Medina',doc_type:'CC',doc_number:'80234564',email:'diego.torres@gvmvet.com',phone:'310 4004444',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000005-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Sandra Patricia Lopez Jimenez',doc_type:'CC',doc_number:'52345675',email:'sandra.lopez@gvmvet.com',phone:'312 4005555',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000006-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Miguel Angel Garcia Suarez',doc_type:'CC',doc_number:'79678986',email:'miguel.garcia@gvmvet.com',phone:'320 4006666',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000007-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Valentina Cruz Mejia',doc_type:'CC',doc_number:'1023456787',email:'valentina.cruz@gvmvet.com',phone:'311 4007777',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000008-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Andres Felipe Gomez Parra',doc_type:'CC',doc_number:'1018901238',email:'andres.gomez@gvmvet.com',phone:'314 4008888',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac000009-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Laura Jimena Sanchez Roa',doc_type:'CC',doc_number:'1015012349',email:'laura.sanchez@gvmvet.com',phone:'316 4009999',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'},
    {id:'ac00000a-0000-0000-0000-000000000001',tenant_id:T,party_type:'PERSON',legal_name:'Juan Esteban Perez Castro',doc_type:'CC',doc_number:'1014523460',email:'juan.perez@gvmvet.com',phone:'318 4010100',is_customer:false,is_vendor:false,city:'Bogota D.C.',department:'Cundinamarca',country:'CO'}
  ]);

  // Empresas de logistica (10) — columnas reales: name, nit, contact_name, phone, email, is_active
  await ins('logistics_carriers', [
    {id:'ca000001-0000-0000-0000-000000000001',tenant_id:T,name:'Servientrega SA',nit:'8600001234',contact_name:'Centro Empresarial',phone:'018000519910',email:'clientes@servientrega.com',is_active:true},
    {id:'ca000002-0000-0000-0000-000000000001',tenant_id:T,name:'Deprisa Avianca Cargo',nit:'8600234561',contact_name:'Atencion al Cliente',phone:'018000953430',email:'deprisa@avianca.com',is_active:true},
    {id:'ca000003-0000-0000-0000-000000000001',tenant_id:T,name:'Coordinadora Mercantil SA',nit:'8600345672',contact_name:'Cotizaciones',phone:'(601) 7448888',email:'cotizaciones@coordinadora.com',is_active:true},
    {id:'ca000004-0000-0000-0000-000000000001',tenant_id:T,name:'TCC SAS',nit:'8600456783',contact_name:'Gestion Comercial',phone:'(601) 3822000',email:'gestion@tcc.com.co',is_active:true},
    {id:'ca000005-0000-0000-0000-000000000001',tenant_id:T,name:'Interrapidisimo SAS',nit:'8600567894',contact_name:'Servicio al Cliente',phone:'018000911099',email:'info@interrapidisimo.com',is_active:true},
    {id:'ca000006-0000-0000-0000-000000000001',tenant_id:T,name:'Envia CDA Logistica',nit:'9000111235',contact_name:'Operaciones',phone:'(601) 4086060',email:'clientes@envia.com.co',is_active:true},
    {id:'ca000007-0000-0000-0000-000000000001',tenant_id:T,name:'DHL Express Colombia SAS',nit:'8900024376',contact_name:'Customer Service',phone:'(601) 4231000',email:'cs.colombia@dhl.com',is_active:true},
    {id:'ca000008-0000-0000-0000-000000000001',tenant_id:T,name:'FedEx Colombia SA',nit:'8300120457',contact_name:'Customer Support',phone:'(601) 6293000',email:'customer.support@fedex.com',is_active:true},
    {id:'ca000009-0000-0000-0000-000000000001',tenant_id:T,name:'Logistica Farma Cadena de Frio SAS',nit:'9001234588',contact_name:'Operaciones Farma',phone:'(601) 5541200',email:'ops@farmafrio.com.co',is_active:true},
    {id:'ca00000a-0000-0000-0000-000000000001',tenant_id:T,name:'Moto Mensajeria Bogota SAS',nit:'9002345699',contact_name:'Pedidos Express',phone:'(601) 7230011',email:'pedidos@motomensajeria.co',is_active:true}
  ]);

  // Productos (type: 'GOOD' para bienes, 'SERVICE' para servicios)
  await ins('products', [
    {id:'bb000001-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-001',name:'Vacuna Rabia Canina 1ml (Nobivac)',type:'GOOD',uom:'UND',status:'ACTIVE',cost:12000,selling_price:28000,min_stock:50,description:'Vacuna antirrabica inactivada para caninos y felinos.',tax_category:'IVA_0'},
    {id:'bb000002-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-002',name:'Vacuna Moquillo+Parvo+Hepatitis (Nobivac DHPPi)',type:'GOOD',uom:'UND',status:'ACTIVE',cost:18000,selling_price:42000,min_stock:40,description:'Vacuna polivalente canina contra moquillo, hepatitis, parvo.',tax_category:'IVA_0'},
    {id:'bb000003-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-003',name:'Ivermectina 1% Inyectable 50ml',type:'GOOD',uom:'UND',status:'ACTIVE',cost:22000,selling_price:48000,min_stock:30,description:'Antiparasitario inyectable de amplio espectro.',tax_category:'IVA_0'},
    {id:'bb000004-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-004',name:'Amoxicilina 500mg Tabletas x14',type:'GOOD',uom:'UND',status:'ACTIVE',cost:8500,selling_price:22000,min_stock:60,description:'Antibiotico de amplio espectro. Tabletas masticables.',tax_category:'IVA_0'},
    {id:'bb000005-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-005',name:'Meloxicam 15mg/ml Inyectable 10ml',type:'GOOD',uom:'UND',status:'ACTIVE',cost:32000,selling_price:68000,min_stock:25,description:'AINE veterinario. Antiinflamatorio y antipiretico.',tax_category:'IVA_0'},
    {id:'bb000006-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-006',name:'Tramadol 50mg/ml Inyectable 10ml',type:'GOOD',uom:'UND',status:'ACTIVE',cost:28000,selling_price:58000,min_stock:20,description:'Analgesico opioide para dolor agudo y cronico.',tax_category:'IVA_0'},
    {id:'bb000007-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-007',name:'Dexametasona 4mg/ml Inyectable 100ml',type:'GOOD',uom:'UND',status:'ACTIVE',cost:35000,selling_price:72000,min_stock:20,description:'Corticosteroide de larga accion. Antiinflamatorio potente.',tax_category:'IVA_0'},
    {id:'bb000008-0000-0000-0000-000000000001',tenant_id:T,sku:'MED-008',name:'Frontline Spot-On Perros M (10-20kg) x3 pip',type:'GOOD',uom:'UND',status:'ACTIVE',cost:38000,selling_price:85000,min_stock:40,description:'Antipulgas y antigarrapatas topico. Fipronil 100mg/ml.',tax_category:'IVA_0'},
    {id:'bb000009-0000-0000-0000-000000000001',tenant_id:T,sku:'ALI-001',name:'Pro Plan Adulto Pollo x15kg',type:'GOOD',uom:'UND',status:'ACTIVE',cost:148000,selling_price:198000,min_stock:15,description:'Alimento seco premium para perros adultos.',tax_category:'IVA_5'},
    {id:'bb00000a-0000-0000-0000-000000000001',tenant_id:T,sku:'ALI-002',name:'Royal Canin Mini Puppy x8kg',type:'GOOD',uom:'UND',status:'ACTIVE',cost:118000,selling_price:165000,min_stock:20,description:'Alimento para cachorros de razas pequenas.',tax_category:'IVA_5'},
    {id:'bb00000b-0000-0000-0000-000000000001',tenant_id:T,sku:'ALI-003',name:'Pedigree Adulto Razas Grandes x25kg',type:'GOOD',uom:'UND',status:'ACTIVE',cost:95000,selling_price:138000,min_stock:10,description:'Alimento completo para perros adultos.',tax_category:'IVA_5'},
    {id:'bb00000c-0000-0000-0000-000000000001',tenant_id:T,sku:'ALI-004',name:'Hills Prescription Diet k/d Canino x4kg',type:'GOOD',uom:'UND',status:'ACTIVE',cost:98000,selling_price:178000,min_stock:10,description:'Dieta terapeutica renal canina.',tax_category:'IVA_0'},
    {id:'bb00000d-0000-0000-0000-000000000001',tenant_id:T,sku:'ALI-005',name:'Whiskas Atun y Verduras Lata 400g',type:'GOOD',uom:'UND',status:'ACTIVE',cost:3200,selling_price:6500,min_stock:100,description:'Alimento humedo para gatos adultos.',tax_category:'IVA_5'},
    {id:'bb00000e-0000-0000-0000-000000000001',tenant_id:T,sku:'ALI-006',name:'Purina Dog Chow Razas Medianas x15kg',type:'GOOD',uom:'UND',status:'ACTIVE',cost:82000,selling_price:118000,min_stock:12,description:'Alimento con vitaminas y proteinas balanceadas.',tax_category:'IVA_5'},
    {id:'bb00000f-0000-0000-0000-000000000001',tenant_id:T,sku:'INS-001',name:'Jeringas 3ml c/aguja 21G x100 uds',type:'GOOD',uom:'CAJ',status:'ACTIVE',cost:18000,selling_price:35000,min_stock:20,description:'Jeringas desechables esteriles con aguja 21G.',tax_category:'IVA_19'},
    {id:'bb000010-0000-0000-0000-000000000001',tenant_id:T,sku:'INS-002',name:'Cateter IV Abbocath 22G x50 uds',type:'GOOD',uom:'CAJ',status:'ACTIVE',cost:42000,selling_price:80000,min_stock:10,description:'Cateter intravenoso de teflon 22G x 25mm esteril.',tax_category:'IVA_19'},
    {id:'bb000011-0000-0000-0000-000000000001',tenant_id:T,sku:'INS-003',name:'Solucion Ringer Lactato 500ml',type:'GOOD',uom:'UND',status:'ACTIVE',cost:4500,selling_price:9500,min_stock:50,description:'Solucion de Hartmann para fluidoterapia.',tax_category:'IVA_0'},
    {id:'bb000012-0000-0000-0000-000000000001',tenant_id:T,sku:'INS-004',name:'Guantes Examen Nitrilo Talla L x100',type:'GOOD',uom:'CAJ',status:'ACTIVE',cost:15000,selling_price:28000,min_stock:15,description:'Guantes de nitrilo sin polvo, antideslizantes.',tax_category:'IVA_19'},
    {id:'bb000013-0000-0000-0000-000000000001',tenant_id:T,sku:'INS-005',name:'Bisturi Desechable #22 x10 uds',type:'GOOD',uom:'CAJ',status:'ACTIVE',cost:12000,selling_price:25000,min_stock:10,description:'Bisturi con hoja de acero inoxidable. Uso unico.',tax_category:'IVA_19'},
    {id:'bb000014-0000-0000-0000-000000000001',tenant_id:T,sku:'INS-006',name:'Collar Isabelino Plastico Talla M',type:'GOOD',uom:'UND',status:'ACTIVE',cost:8000,selling_price:18000,min_stock:30,description:'Collar protector post-quirurgico. Diametro 22cm.',tax_category:'IVA_19'},
    {id:'bb000015-0000-0000-0000-000000000001',tenant_id:T,sku:'EQU-001',name:'Termometro Digital Veterinario',type:'GOOD',uom:'UND',status:'ACTIVE',cost:22000,selling_price:48000,min_stock:5,description:'Termometro electronico rectal/axilar. 10 segundos.',tax_category:'IVA_19'},
    {id:'bb000016-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-001',name:'Consulta Veterinaria General',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:60000,min_stock:0,description:'Consulta clinica: anamnesis, examen fisico, diagnostico.',tax_category:'IVA_0'},
    {id:'bb000017-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-002',name:'Consulta Especialidad (Cardiologia/Derm/Neuro)',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:120000,min_stock:0,description:'Consulta con medico especialista.',tax_category:'IVA_0'},
    {id:'bb000018-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-003',name:'Cirugia Castracion Canino (OHE o ORQ)',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:380000,min_stock:0,description:'Ovariohisterectomia o orquiectomia. Incluye anestesia.',tax_category:'IVA_0'},
    {id:'bb000019-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-004',name:'Cirugia Castracion Felino',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:280000,min_stock:0,description:'OHE o ORQ felina. Incluye anestesia inyectable.',tax_category:'IVA_0'},
    {id:'bb00001a-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-005',name:'Profilaxis Dental (Limpieza Dental)',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:220000,min_stock:0,description:'Detartraje supra e infragingival bajo anestesia.',tax_category:'IVA_0'},
    {id:'bb00001b-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-006',name:'Hospitalizacion Diaria (24h)',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:95000,min_stock:0,description:'Cuidado hospitalario: monitoreo, fluidoterapia, medicacion.',tax_category:'IVA_0'},
    {id:'bb00001c-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-007',name:'Bano y Peluqueria Canino Raza Mediana',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:85000,min_stock:0,description:'Bano, secado, corte unias y corte de pelo.',tax_category:'IVA_19'},
    {id:'bb00001d-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-008',name:'Laboratorio: Hemograma Completo',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:75000,min_stock:0,description:'CBC con diferencial y plaquetas. Resultado en 2 horas.',tax_category:'IVA_0'},
    {id:'bb00001e-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-009',name:'Radiografia Digital (2 Vistas)',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:145000,min_stock:0,description:'Rx digital toracica o abdominal en 2 proyecciones.',tax_category:'IVA_0'},
    {id:'bb00001f-0000-0000-0000-000000000001',tenant_id:T,sku:'SVC-010',name:'Ecografia Abdominal',type:'SERVICE',uom:'UND',status:'ACTIVE',cost:0,selling_price:180000,min_stock:0,description:'Ecografia abdominal completa con sonda 5-8 MHz.',tax_category:'IVA_0'}
  ]);

  // Empleados — transport_allowance es boolean (true/false), no monto
  // contract_type validos: INDEFINIDO, FIJO, OBRA_LABOR, APRENDIZAJE, PRESTACION_SERVICIOS
  await ins('employees', [
    {id:'bc000001-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000001-0000-0000-0000-000000000001',contract_type:'INDEFINIDO',start_date:'2023-03-01',end_date:null,salary:4000000,transport_allowance:true,risk_level:'1',payment_method:'TRANSFERENCIA',bank_name:'Bancolombia',bank_account_type:'AHORROS',bank_account_number:'695123456789',status:'ACTIVE'},
    {id:'bc000002-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000002-0000-0000-0000-000000000001',contract_type:'INDEFINIDO',start_date:'2022-08-15',end_date:null,salary:3500000,transport_allowance:true,risk_level:'2',payment_method:'TRANSFERENCIA',bank_name:'Davivienda',bank_account_type:'AHORROS',bank_account_number:'001923456789',status:'ACTIVE'},
    {id:'bc000003-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000003-0000-0000-0000-000000000001',contract_type:'INDEFINIDO',start_date:'2024-01-10',end_date:null,salary:1800000,transport_allowance:true,risk_level:'2',payment_method:'TRANSFERENCIA',bank_name:'BBVA',bank_account_type:'AHORROS',bank_account_number:'0172345678',status:'ACTIVE'},
    {id:'bc000004-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000004-0000-0000-0000-000000000001',contract_type:'FIJO',start_date:'2025-01-01',end_date:'2025-12-31',salary:2800000,transport_allowance:true,risk_level:'1',payment_method:'TRANSFERENCIA',bank_name:'Banco Bogota',bank_account_type:'CORRIENTE',bank_account_number:'213345678',status:'ACTIVE'},
    {id:'bc000005-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000005-0000-0000-0000-000000000001',contract_type:'INDEFINIDO',start_date:'2023-11-01',end_date:null,salary:1500000,transport_allowance:true,risk_level:'1',payment_method:'TRANSFERENCIA',bank_name:'Nequi',bank_account_type:'AHORROS',bank_account_number:'3134005555',status:'ACTIVE'},
    {id:'bc000006-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000006-0000-0000-0000-000000000001',contract_type:'PRESTACION_SERVICIOS',start_date:'2025-06-01',end_date:'2026-05-31',salary:6000000,transport_allowance:false,risk_level:'3',payment_method:'TRANSFERENCIA',bank_name:'Bancolombia',bank_account_type:'AHORROS',bank_account_number:'695678901234',status:'ACTIVE'},
    {id:'bc000007-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000007-0000-0000-0000-000000000001',contract_type:'FIJO',start_date:'2025-09-01',end_date:'2026-02-28',salary:3200000,transport_allowance:true,risk_level:'2',payment_method:'TRANSFERENCIA',bank_name:'Davivienda',bank_account_type:'AHORROS',bank_account_number:'001789012345',status:'ACTIVE'},
    {id:'bc000008-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000008-0000-0000-0000-000000000001',contract_type:'OBRA_LABOR',start_date:'2025-10-15',end_date:null,salary:1600000,transport_allowance:true,risk_level:'3',payment_method:'EFECTIVO',bank_name:null,bank_account_type:null,bank_account_number:null,status:'ACTIVE'},
    {id:'bc000009-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac000009-0000-0000-0000-000000000001',contract_type:'FIJO',start_date:'2026-01-15',end_date:'2026-04-15',salary:1400000,transport_allowance:true,risk_level:'1',payment_method:'TRANSFERENCIA',bank_name:'Nequi',bank_account_type:'AHORROS',bank_account_number:'3164009999',status:'ACTIVE'},
    {id:'bc00000a-0000-0000-0000-000000000001',tenant_id:T,party_id:'ac00000a-0000-0000-0000-000000000001',contract_type:'INDEFINIDO',start_date:'2024-06-01',end_date:null,salary:1160000,transport_allowance:true,risk_level:'1',payment_method:'TRANSFERENCIA',bank_name:'Banco Bogota',bank_account_type:'AHORROS',bank_account_number:'213890123',status:'ACTIVE'}
  ]);

  // Cuentas tesoreria
  await ins('treasury_accounts', [
    {id:'bd000001-0000-0000-0000-000000000001',tenant_id:T,name:'Bancolombia Cta Cte Principal',type:'BANK',bank_name:'Bancolombia',account_number:'695-123456-78',balance:85420000},
    {id:'bd000002-0000-0000-0000-000000000001',tenant_id:T,name:'Davivienda Cta Ahorros Nomina',type:'BANK',bank_name:'Davivienda',account_number:'0019-234567-89',balance:22180000},
    {id:'bd000003-0000-0000-0000-000000000001',tenant_id:T,name:'Caja General Clinica',type:'CASH',bank_name:null,account_number:null,balance:3250000},
    {id:'bd000004-0000-0000-0000-000000000001',tenant_id:T,name:'Caja Chica Administracion',type:'CASH',bank_name:null,account_number:null,balance:850000}
  ]);

  // Documentos — usando status validos: SENT (pendiente), ACCEPTED (pagado)
  // doc_type: INVOICE, VENDOR_BILL (en lugar de PURCHASE)
  await ins('documents', [
    {id:'d0000001-0000-0000-0000-000000000001',tenant_id:T,doc_type:'INVOICE',number:'FV-2026-0001',party_id:'ab000001-0000-0000-0000-000000000001',issue_date:'2026-02-01',due_date:'2026-03-01',currency:'COP',subtotal:2205000,taxes:419000,total:2624000,status:'SENT',balance:2624000},
    {id:'d0000002-0000-0000-0000-000000000001',tenant_id:T,doc_type:'INVOICE',number:'FV-2026-0002',party_id:'ab000006-0000-0000-0000-000000000001',issue_date:'2026-02-05',due_date:'2026-02-05',currency:'COP',subtotal:490000,taxes:0,total:490000,status:'ACCEPTED',balance:0},
    {id:'d0000003-0000-0000-0000-000000000001',tenant_id:T,doc_type:'INVOICE',number:'FV-2026-0003',party_id:'ab000002-0000-0000-0000-000000000001',issue_date:'2026-02-10',due_date:'2026-03-12',currency:'COP',subtotal:4820000,taxes:0,total:4820000,status:'SENT',balance:4820000},
    {id:'d0000004-0000-0000-0000-000000000001',tenant_id:T,doc_type:'INVOICE',number:'FV-2026-0004',party_id:'ab000005-0000-0000-0000-000000000001',issue_date:'2026-02-12',due_date:'2026-02-12',currency:'COP',subtotal:335000,taxes:16150,total:351150,status:'ACCEPTED',balance:0},
    {id:'d0000005-0000-0000-0000-000000000001',tenant_id:T,doc_type:'INVOICE',number:'FV-2026-0005',party_id:'ab000004-0000-0000-0000-000000000001',issue_date:'2026-02-15',due_date:'2026-03-17',currency:'COP',subtotal:1650000,taxes:31350,total:1681350,status:'SENT',balance:1681350},
    {id:'d0000006-0000-0000-0000-000000000001',tenant_id:T,doc_type:'INVOICE',number:'FV-2026-0006',party_id:'ab000003-0000-0000-0000-000000000001',issue_date:'2026-01-20',due_date:'2026-02-20',currency:'COP',subtotal:6350000,taxes:0,total:6350000,status:'SENT',balance:6350000},
    {id:'d0000007-0000-0000-0000-000000000001',tenant_id:T,doc_type:'INVOICE',number:'FV-2026-0007',party_id:'ab000008-0000-0000-0000-000000000001',issue_date:'2026-02-20',due_date:'2026-03-22',currency:'COP',subtotal:3150000,taxes:0,total:3150000,status:'SENT',balance:3150000},
    {id:'d0000008-0000-0000-0000-000000000001',tenant_id:T,doc_type:'VENDOR_BILL',number:'OC-2026-0001',party_id:'aa000001-0000-0000-0000-000000000001',issue_date:'2026-02-03',due_date:'2026-03-03',currency:'COP',subtotal:840000,taxes:159600,total:999600,status:'ACCEPTED',balance:0},
    {id:'d0000009-0000-0000-0000-000000000001',tenant_id:T,doc_type:'VENDOR_BILL',number:'OC-2026-0002',party_id:'aa000003-0000-0000-0000-000000000001',issue_date:'2026-02-08',due_date:'2026-03-10',currency:'COP',subtotal:2460000,taxes:467400,total:2927400,status:'SENT',balance:2927400},
    {id:'d000000a-0000-0000-0000-000000000001',tenant_id:T,doc_type:'VENDOR_BILL',number:'OC-2026-0003',party_id:'aa000006-0000-0000-0000-000000000001',issue_date:'2026-02-14',due_date:'2026-03-16',currency:'COP',subtotal:325000,taxes:61750,total:386750,status:'SENT',balance:386750}
  ]);

  // Lineas de documentos
  await ins('document_lines', [
    {id:'da000001-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000001-0000-0000-0000-000000000001',product_id:'bb000001-0000-0000-0000-000000000001',description:'Vacuna Rabia Canina 1ml x50',qty:50,unit_price:28000,line_total:1400000,tax_config:{rate:0}},
    {id:'da000002-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000001-0000-0000-0000-000000000001',product_id:'bb000002-0000-0000-0000-000000000001',description:'Vacuna DHPPi x15',qty:15,unit_price:42000,line_total:630000,tax_config:{rate:0}},
    {id:'da000003-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000001-0000-0000-0000-000000000001',product_id:'bb00000f-0000-0000-0000-000000000001',description:'Jeringas 3ml x100 - 5 cajas',qty:5,unit_price:35000,line_total:175000,tax_config:{rate:0.19}},
    {id:'da000004-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000002-0000-0000-0000-000000000001',product_id:'bb000016-0000-0000-0000-000000000001',description:'Consulta Veterinaria General',qty:1,unit_price:60000,line_total:60000,tax_config:{rate:0}},
    {id:'da000005-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000002-0000-0000-0000-000000000001',product_id:'bb000018-0000-0000-0000-000000000001',description:'Castracion Canino OHE',qty:1,unit_price:380000,line_total:380000,tax_config:{rate:0}},
    {id:'da000006-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000002-0000-0000-0000-000000000001',product_id:'bb00001d-0000-0000-0000-000000000001',description:'Hemograma completo pre-quirurgico',qty:1,unit_price:75000,line_total:75000,tax_config:{rate:0}},
    {id:'da000007-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000003-0000-0000-0000-000000000001',product_id:'bb000003-0000-0000-0000-000000000001',description:'Ivermectina 1% 50ml x50 frascos',qty:50,unit_price:48000,line_total:2400000,tax_config:{rate:0}},
    {id:'da000008-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000003-0000-0000-0000-000000000001',product_id:'bb000007-0000-0000-0000-000000000001',description:'Dexametasona 4mg/ml x10 frascos',qty:10,unit_price:72000,line_total:720000,tax_config:{rate:0}},
    {id:'da000009-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000003-0000-0000-0000-000000000001',product_id:'bb000011-0000-0000-0000-000000000001',description:'Ringer Lactato 500ml x180 bolsas',qty:180,unit_price:9500,line_total:1710000,tax_config:{rate:0}},
    {id:'da00000a-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000004-0000-0000-0000-000000000001',product_id:'bb000016-0000-0000-0000-000000000001',description:'Consulta Veterinaria General',qty:1,unit_price:60000,line_total:60000,tax_config:{rate:0}},
    {id:'da00000b-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000004-0000-0000-0000-000000000001',product_id:'bb00001e-0000-0000-0000-000000000001',description:'Radiografia Digital 2 Vistas',qty:1,unit_price:145000,line_total:145000,tax_config:{rate:0}},
    {id:'da00000c-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000004-0000-0000-0000-000000000001',product_id:'bb00001c-0000-0000-0000-000000000001',description:'Bano y Peluqueria Canino',qty:1,unit_price:85000,line_total:85000,tax_config:{rate:0.19}},
    {id:'da00000d-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000008-0000-0000-0000-000000000001',product_id:'bb000001-0000-0000-0000-000000000001',description:'Vacuna Rabia Canina x50 dosis',qty:50,unit_price:12000,line_total:600000,tax_config:{rate:0}},
    {id:'da00000e-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000008-0000-0000-0000-000000000001',product_id:'bb000002-0000-0000-0000-000000000001',description:'Vacuna DHPPi x10 dosis',qty:10,unit_price:18000,line_total:180000,tax_config:{rate:0}},
    {id:'da00000f-0000-0000-0000-000000000001',tenant_id:T,document_id:'d0000008-0000-0000-0000-000000000001',product_id:'bb000003-0000-0000-0000-000000000001',description:'Ivermectina 1% x10 frascos',qty:10,unit_price:22000,line_total:220000,tax_config:{rate:0}}
  ]);

  // Transacciones tesoreria
  await ins('treasury_transactions', [
    {id:'db000001-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000001-0000-0000-0000-000000000001',party_id:'ab000006-0000-0000-0000-000000000001',amount:490000,transaction_type:'RECEIPT',date:'2026-02-05',description:'Pago FV-2026-0002 Carlos Perez - Castracion canino',reference_number:'CONSIG-001',is_reconciled:true},
    {id:'db000002-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000003-0000-0000-0000-000000000001',party_id:'ab000005-0000-0000-0000-000000000001',amount:351150,transaction_type:'RECEIPT',date:'2026-02-12',description:'Pago efectivo FV-2026-0004 Maria Garcia',reference_number:'EFEC-001',is_reconciled:true},
    {id:'db000003-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000001-0000-0000-0000-000000000001',party_id:'aa000001-0000-0000-0000-000000000001',amount:-999600,transaction_type:'PAYMENT',date:'2026-02-06',description:'Pago OC-2026-0001 MSD Salud Animal - Vacunas',reference_number:'TRF-20260206-001',is_reconciled:true},
    {id:'db000004-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000003-0000-0000-0000-000000000001',party_id:null,amount:-320000,transaction_type:'PAYMENT',date:'2026-02-14',description:'Compra materiales limpieza y aseo instalaciones',reference_number:'FACT-EXT-456',is_reconciled:false},
    {id:'db000005-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000001-0000-0000-0000-000000000001',party_id:null,amount:-8560000,transaction_type:'PAYMENT',date:'2026-02-20',description:'Pago nomina quincenal - 10 empleados',reference_number:'NOMINA-2026-02-1Q',is_reconciled:true},
    {id:'db000006-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000001-0000-0000-0000-000000000001',party_id:null,amount:-1850000,transaction_type:'PAYMENT',date:'2026-02-22',description:'Pago arrendamiento clinica - Febrero 2026',reference_number:'ARREND-FEB-2026',is_reconciled:true},
    {id:'db000007-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000001-0000-0000-0000-000000000001',party_id:'ab000008-0000-0000-0000-000000000001',amount:1575000,transaction_type:'RECEIPT',date:'2026-02-23',description:'Anticipo 50% FV-2026-0007 Zoonosis Bogota',reference_number:'CONSIG-002',is_reconciled:false},
    {id:'db000008-0000-0000-0000-000000000001',tenant_id:T,account_id:'bd000003-0000-0000-0000-000000000001',party_id:'ab000004-0000-0000-0000-000000000001',amount:840675,transaction_type:'RECEIPT',date:'2026-02-25',description:'Abono 50% FV-2026-0005 Peluditos Felices',reference_number:'EFEC-002',is_reconciled:false}
  ]);

  // Stock via inventory_movements (product_stock es una vista)
  const wh1 = 'b0000001-0000-0000-0000-000000000001'; // BOD-PRINCIPAL
  const wh2 = 'b0000001-0000-0000-0000-000000000002'; // BOD-MEDICAMENTOS
  const stockItems = [
    {pid:'bb000001-0000-0000-0000-000000000001',wh:wh2,qty:78,cost:12000},
    {pid:'bb000002-0000-0000-0000-000000000001',wh:wh2,qty:42,cost:18000},
    {pid:'bb000003-0000-0000-0000-000000000001',wh:wh2,qty:35,cost:22000},
    {pid:'bb000004-0000-0000-0000-000000000001',wh:wh2,qty:68,cost:8500},
    {pid:'bb000005-0000-0000-0000-000000000001',wh:wh2,qty:22,cost:32000},
    {pid:'bb000006-0000-0000-0000-000000000001',wh:wh2,qty:18,cost:28000},
    {pid:'bb000007-0000-0000-0000-000000000001',wh:wh2,qty:24,cost:35000},
    {pid:'bb000008-0000-0000-0000-000000000001',wh:wh2,qty:56,cost:38000},
    {pid:'bb000009-0000-0000-0000-000000000001',wh:wh1,qty:18,cost:148000},
    {pid:'bb00000a-0000-0000-0000-000000000001',wh:wh1,qty:24,cost:118000},
    {pid:'bb00000b-0000-0000-0000-000000000001',wh:wh1,qty:12,cost:95000},
    {pid:'bb00000c-0000-0000-0000-000000000001',wh:wh1,qty:8,cost:98000},
    {pid:'bb00000d-0000-0000-0000-000000000001',wh:wh1,qty:144,cost:3200},
    {pid:'bb00000e-0000-0000-0000-000000000001',wh:wh1,qty:15,cost:82000},
    {pid:'bb00000f-0000-0000-0000-000000000001',wh:wh2,qty:22,cost:18000},
    {pid:'bb000010-0000-0000-0000-000000000001',wh:wh2,qty:14,cost:42000},
    {pid:'bb000011-0000-0000-0000-000000000001',wh:wh2,qty:86,cost:4500},
    {pid:'bb000012-0000-0000-0000-000000000001',wh:wh2,qty:18,cost:15000},
    {pid:'bb000013-0000-0000-0000-000000000001',wh:wh2,qty:12,cost:12000},
    {pid:'bb000014-0000-0000-0000-000000000001',wh:wh1,qty:38,cost:8000},
    {pid:'bb000015-0000-0000-0000-000000000001',wh:wh1,qty:6,cost:22000}
  ];
  // movement_type validos: IN, OUT, TRANSFER
  const invMovements = stockItems.map((s,i) => ({
    tenant_id: T,
    warehouse_id: s.wh,
    product_id: s.pid,
    type: 'IN',
    qty: s.qty,
    cost: s.cost,
    occurred_at: '2026-01-01T00:00:00Z'
  }));
  const { error: ie } = await supabase.from('inventory_movements').insert(invMovements);
  if (ie) console.error('\u2717 inventory_movements: ' + ie.message);
  else console.log('\u2713 inventory_movements (' + invMovements.length + ' rows)');

  // Periodos nomina
  await ins('payroll_periods', [
    {id:'dc000001-0000-0000-0000-000000000001',tenant_id:T,name:'Nomina Enero 2026',start_date:'2026-01-01',end_date:'2026-01-31',status:'CLOSED'},
    {id:'dc000002-0000-0000-0000-000000000001',tenant_id:T,name:'Nomina Febrero 2026',start_date:'2026-02-01',end_date:'2026-02-28',status:'OPEN'}
  ]);

  // Prestamos nomina
  await ins('payroll_loans', [
    {id:'dd000001-0000-0000-0000-000000000001',tenant_id:T,employee_id:'bc000001-0000-0000-0000-000000000001',amount_total:3000000,amount_paid:1000000,installment_count:6,installments_paid:2,installment_amount:500000,interest_rate:0,start_date:'2025-12-01',description:'Prestamo libranza - urgencia medica familiar',status:'ACTIVE'},
    {id:'dd000002-0000-0000-0000-000000000001',tenant_id:T,employee_id:'bc000004-0000-0000-0000-000000000001',amount_total:1500000,amount_paid:500000,installment_count:3,installments_paid:1,installment_amount:500000,interest_rate:0,start_date:'2026-01-01',description:'Anticipo de vacaciones',status:'ACTIVE'}
  ]);

  // Beneficios nomina
  await ins('payroll_benefits', [
    {id:'de000001-0000-0000-0000-000000000001',tenant_id:T,employee_id:'bc000001-0000-0000-0000-000000000001',name:'Auxilio Movilidad',amount:200000,is_taxable:false,is_salary:false,frequency:'MONTHLY',status:'ACTIVE'},
    {id:'de000002-0000-0000-0000-000000000001',tenant_id:T,employee_id:'bc000002-0000-0000-0000-000000000001',name:'Auxilio Movilidad',amount:200000,is_taxable:false,is_salary:false,frequency:'MONTHLY',status:'ACTIVE'},
    {id:'de000003-0000-0000-0000-000000000001',tenant_id:T,employee_id:'bc000006-0000-0000-0000-000000000001',name:'Bono Productividad Cirugias',amount:800000,is_taxable:true,is_salary:false,frequency:'MONTHLY',status:'ACTIVE'},
    {id:'de000004-0000-0000-0000-000000000001',tenant_id:T,employee_id:'bc000005-0000-0000-0000-000000000001',name:'Auxilio Alimentacion',amount:100000,is_taxable:false,is_salary:false,frequency:'MONTHLY',status:'ACTIVE'},
    {id:'de000005-0000-0000-0000-000000000001',tenant_id:T,employee_id:'bc00000a-0000-0000-0000-000000000001',name:'Auxilio Alimentacion',amount:100000,is_taxable:false,is_salary:false,frequency:'MONTHLY',status:'ACTIVE'}
  ]);

  // CRM Leads
  await ins('leads', [
    {id:'fa000001-0000-0000-0000-000000000001',tenant_id:T,name:'Rodrigo Fuentes',company_name:'Granja Porcina El Refugio',email:'rfuentes@granjaerefugio.com',phone:'310 8001122',status:'QUALIFIED',source:'REFERRAL',notes:'Interesado en programa de vacunacion porcina mensual. 450 cerdos. Potencial $12M/anio.',assigned_to:ADMIN},
    {id:'fa000002-0000-0000-0000-000000000001',tenant_id:T,name:'Catalina Morales',company_name:'Clinipet Bogota Sur',email:'cmorales@clinipet.com',phone:'312 8002233',status:'NEW',source:'WEBSITE',notes:'Clinica veterinaria en expansion. Busca proveedor de medicamentos al por mayor.',assigned_to:ADMIN},
    {id:'fa000003-0000-0000-0000-000000000001',tenant_id:T,name:'Hector Mejia',company_name:'Criadero Yorkshire El Prado',email:'hmejia@yorkshireprado.com',phone:'314 8003344',status:'CONTACTED',source:'COLD_CALL',notes:'Criadero de 80 perros. Requiere desparasitacion trimestral. Cita agendada.',assigned_to:ADMIN},
    {id:'fa000004-0000-0000-0000-000000000001',tenant_id:T,name:'Adriana Vargas',company_name:'Alcaldia de Chia - Unidad Zoonosis',email:'avargas@chia.gov.co',phone:'(601) 8614333',status:'PROPOSAL',source:'REFERRAL',notes:'Licitacion para esterilizacion de caninos callejeros. 300 procedimientos aprox.',assigned_to:ADMIN}
  ]);

  // CRM Oportunidades
  await ins('crm_opportunities', [
    {id:'fb000001-0000-0000-0000-000000000001',tenant_id:T,name:'Contrato Anual - Granja Avicola San Juan',description:'Renovacion y expansion de contrato de medicina veterinaria preventiva.',value:48000000,probability:85,stage:'PROPOSAL',expected_close_date:'2026-03-15',lead_id:null,party_id:'ab000002-0000-0000-0000-000000000001',assigned_to:ADMIN},
    {id:'fb000002-0000-0000-0000-000000000001',tenant_id:T,name:'Licitacion Esterilizacion Canina - Chia',description:'Proyecto de esterilizacion masiva de caninos callejeros para Alcaldia de Chia.',value:45000000,probability:60,stage:'NEGOTIATION',expected_close_date:'2026-04-01',lead_id:'fa000004-0000-0000-0000-000000000001',party_id:null,assigned_to:ADMIN},
    {id:'fb000003-0000-0000-0000-000000000001',tenant_id:T,name:'Programa Vacunacion Porcina - El Refugio',description:'Plan anual de vacunacion y control sanitario para granja de 450 cerdos.',value:12000000,probability:70,stage:'QUALIFIED',expected_close_date:'2026-03-30',lead_id:'fa000001-0000-0000-0000-000000000001',party_id:null,assigned_to:ADMIN},
    {id:'fb000004-0000-0000-0000-000000000001',tenant_id:T,name:'Convenio Servicio Tecnico - VetParque',description:'Propuesta para ser proveedor exclusivo de medicamentos de VetParque.',value:96000000,probability:40,stage:'DISCOVERY',expected_close_date:'2026-06-30',lead_id:null,party_id:'ab000001-0000-0000-0000-000000000001',assigned_to:ADMIN}
  ]);

  // Tickets soporte
  const sla = Date.now();
  await ins('support_tickets', [
    {id:'fc000001-0000-0000-0000-000000000001',tenant_id:T,party_id:'ab000002-0000-0000-0000-000000000001',number:'TK-2026-0001',subject:'Error precio Ringer Lactato en FV-2026-0003',description:'Precio unitario de $9.500 cuando el acordado es $8.800. Solicitan nota credito.',category:'BILLING',priority:'HIGH',status:'OPEN',assigned_to:ADMIN,sla_deadline:new Date(sla+172800000).toISOString()},
    {id:'fc000002-0000-0000-0000-000000000001',tenant_id:T,party_id:'ab000001-0000-0000-0000-000000000001',number:'TK-2026-0002',subject:'RMA - Vacunas rechazadas por quiebre cadena de frio',description:'50 dosis Vacuna Rabia Canina llegaron a 12 grados C. Solicitan reposicion.',category:'RMA',priority:'CRITICAL',status:'IN_PROGRESS',assigned_to:ADMIN,sla_deadline:new Date(sla+86400000).toISOString()},
    {id:'fc000003-0000-0000-0000-000000000001',tenant_id:T,party_id:'ab000004-0000-0000-0000-000000000001',number:'TK-2026-0003',subject:'Consulta: disponibilidad Hills Kidney Diet',description:'Peluditos Felices pregunta disponibilidad Hills k/d para la semana siguiente.',category:'LOGISTICS',priority:'LOW',status:'RESOLVED',assigned_to:ADMIN,sla_deadline:new Date(sla+259200000).toISOString()},
    {id:'fc000004-0000-0000-0000-000000000001',tenant_id:T,party_id:'ab000003-0000-0000-0000-000000000001',number:'TK-2026-0004',subject:'FV-2026-0006 vencida - plan de pago 3 cuotas',description:'Hacienda La Esperanza solicita plan de pago en 3 cuotas para factura vencida ($6.350.000).',category:'BILLING',priority:'MEDIUM',status:'OPEN',assigned_to:ADMIN,sla_deadline:new Date(sla+345600000).toISOString()}
  ]);

  console.log('\n=== Seed veterinario completado! ===');
}
run().catch(e => console.error('Fatal:', e));
