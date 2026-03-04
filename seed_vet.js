// GVM Corp ERP — Seed Completo (~4,500 filas)
// Usage: npx supabase db push && node seed_vet.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const sb = createClient('https://qoivnsnugfblfebrpifq.supabase.co', env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\n]+)/)?.[1]);
const T = 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9';
const A = '4d529f53-df07-434d-a7b6-d3e9b3f34634';
const uid = (px,n) => `${px}${n.toString(16).padStart(6,'0')}-0000-0000-0000-000000000001`;
const d = (y,m,day) => `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
let total = 0;

async function ins(table, rows) {
  const arr = Array.isArray(rows) ? rows : [rows];
  const { error } = await sb.from(table).insert(arr);
  if (error) { console.error(`X ${table}: ${error.message}`); return false; }
  total += arr.length; console.log(`+ ${table} (${arr.length})`); return true;
}
async function batch(table, rows, sz=500) {
  for (let i=0; i<rows.length; i+=sz) {
    const c = rows.slice(i, i+sz);
    const { error } = await sb.from(table).insert(c);
    if (error) { console.error(`X ${table}[${i}]: ${error.message}`); return false; }
    total += c.length;
  }
  console.log(`+ ${table} (${rows.length})`); return true;
}

async function clean() {
  console.log('\n-- CLEAN --');
  for (const t of [
    'app_notifications','bank_statement_lines','bank_statements','payment_links','recurring_invoices',
    'electronic_documents','period_close_items','fiscal_periods','logistics_shipment_items','logistics_shipments',
    'maintenance_orders','equipment','quality_ncrs','quality_inspections','training_records','training_programs',
    'absence_requests','overtime_requests','payroll_attendance','payroll_benefits','payroll_loans','payroll_periods',
    'journal_lines','journal_entries','treasury_transactions','budget_lines','budgets','fixed_assets','contracts',
    'support_tickets','crm_opportunities','leads','inventory_movements','product_lots','product_stock',
    'purchase_order_lines','purchase_orders','document_lines','documents','dian_resolutions','dian_config',
    'employees','products','warehouse_locations','logistics_carriers','treasury_accounts','parties','warehouses','chart_accounts'
  ]) {
    const { error } = await sb.from(t).delete().eq('tenant_id', T);
    if (error && !error.message.includes('does not exist') && !error.message.includes('column')) {
      console.error(`  X clean ${t}: ${error.message}`);
    }
  }
  console.log('  OK cleaned');
}

// ═══════ DATA ═══════
const WH = [uid('b0',1), uid('b0',2), uid('b0',3)];

const ACCTS = [
  ['1','ACTIVOS','DEBIT',1,null,'ASSET'],['11','DISPONIBLE','DEBIT',2,'1','ASSET'],
  ['1105','CAJA','DEBIT',3,'11','ASSET'],['110505','CAJA GENERAL','DEBIT',4,'1105','ASSET'],
  ['1110','BANCOS','DEBIT',3,'11','ASSET'],['111005','MONEDA NACIONAL','DEBIT',4,'1110','ASSET'],
  ['1120','CUENTAS DE AHORRO','DEBIT',3,'11','ASSET'],['112005','BANCOS NACIONALES','DEBIT',4,'1120','ASSET'],
  ['12','INVERSIONES','DEBIT',2,'1','ASSET'],['1205','ACCIONES','DEBIT',3,'12','ASSET'],
  ['13','DEUDORES','DEBIT',2,'1','ASSET'],['1305','CLIENTES','DEBIT',3,'13','ASSET'],
  ['130505','NACIONALES','DEBIT',4,'1305','ASSET'],['1355','ANTICIPOS Y AVANCES','DEBIT',3,'13','ASSET'],
  ['1365','CXCOBRAR TRABAJADORES','DEBIT',3,'13','ASSET'],['1380','DEUDORES VARIOS','DEBIT',3,'13','ASSET'],
  ['14','INVENTARIOS','DEBIT',2,'1','ASSET'],['1435','MERCANCIAS NO FABRICADAS','DEBIT',3,'14','ASSET'],
  ['1465','INVENTARIOS EN TRANSITO','DEBIT',3,'14','ASSET'],
  ['15','PROPIEDAD PLANTA Y EQUIPO','DEBIT',2,'1','ASSET'],['1504','TERRENOS','DEBIT',3,'15','ASSET'],
  ['1516','CONSTRUCCIONES','DEBIT',3,'15','ASSET'],['1520','MAQUINARIA Y EQUIPO','DEBIT',3,'15','ASSET'],
  ['1524','EQUIPO DE OFICINA','DEBIT',3,'15','ASSET'],['1528','EQUIPO COMPUTACION','DEBIT',3,'15','ASSET'],
  ['1540','FLOTA Y EQUIPO TRANSPORTE','DEBIT',3,'15','ASSET'],
  ['1592','DEPRECIACION ACUMULADA','CREDIT',3,'15','ASSET'],
  ['16','INTANGIBLES','DEBIT',2,'1','ASSET'],['17','DIFERIDOS','DEBIT',2,'1','ASSET'],
  ['2','PASIVOS','CREDIT',1,null,'LIABILITY'],['21','OBLIGACIONES FINANCIERAS','CREDIT',2,'2','LIABILITY'],
  ['2105','BANCOS NACIONALES','CREDIT',3,'21','LIABILITY'],
  ['22','PROVEEDORES','CREDIT',2,'2','LIABILITY'],['2205','PROVEEDORES NACIONALES','CREDIT',3,'22','LIABILITY'],
  ['23','CUENTAS POR PAGAR','CREDIT',2,'2','LIABILITY'],['2335','COSTOS Y GASTOS POR PAGAR','CREDIT',3,'23','LIABILITY'],
  ['2365','RETENCION EN LA FUENTE','CREDIT',3,'23','LIABILITY'],['2367','IVA RETENIDO','CREDIT',3,'23','LIABILITY'],
  ['2370','RETENCIONES NOMINA','CREDIT',3,'23','LIABILITY'],
  ['24','IMPUESTOS GRAVAMENES Y TASAS','CREDIT',2,'2','LIABILITY'],['2404','IVA POR PAGAR','CREDIT',3,'24','LIABILITY'],
  ['2408','IMPUESTO SOBRE LA RENTA','CREDIT',3,'24','LIABILITY'],
  ['25','OBLIGACIONES LABORALES','CREDIT',2,'2','LIABILITY'],['2505','SALARIOS POR PAGAR','CREDIT',3,'25','LIABILITY'],
  ['2510','CESANTIAS CONSOLIDADAS','CREDIT',3,'25','LIABILITY'],['2515','INTERESES CESANTIAS','CREDIT',3,'25','LIABILITY'],
  ['2520','PRIMA DE SERVICIOS','CREDIT',3,'25','LIABILITY'],['2525','VACACIONES CONSOLIDADAS','CREDIT',3,'25','LIABILITY'],
  ['26','PASIVOS ESTIMADOS','CREDIT',2,'2','LIABILITY'],['27','DIFERIDOS PASIVO','CREDIT',2,'2','LIABILITY'],
  ['28','OTROS PASIVOS','CREDIT',2,'2','LIABILITY'],
  ['3','PATRIMONIO','CREDIT',1,null,'EQUITY'],['31','CAPITAL SOCIAL','CREDIT',2,'3','EQUITY'],
  ['3105','CAPITAL SUSCRITO Y PAGADO','CREDIT',3,'31','EQUITY'],
  ['33','RESERVAS','CREDIT',2,'3','EQUITY'],['3305','RESERVA LEGAL','CREDIT',3,'33','EQUITY'],
  ['36','RESULTADOS DEL EJERCICIO','CREDIT',2,'3','EQUITY'],['3605','UTILIDAD DEL EJERCICIO','CREDIT',3,'36','EQUITY'],
  ['3610','PERDIDA DEL EJERCICIO','DEBIT',3,'36','EQUITY'],
  ['37','RESULTADOS ANTERIORES','CREDIT',2,'3','EQUITY'],['3705','UTILIDADES ACUMULADAS','CREDIT',3,'37','EQUITY'],
  ['4','INGRESOS','CREDIT',1,null,'REVENUE'],['41','OPERACIONALES','CREDIT',2,'4','REVENUE'],
  ['4135','COMERCIO AL POR MAYOR Y MENOR','CREDIT',3,'41','REVENUE'],
  ['413505','VENTA PRODUCTOS VETERINARIOS','CREDIT',4,'4135','REVENUE'],
  ['413510','VENTA ALIMENTOS MASCOTAS','CREDIT',4,'4135','REVENUE'],
  ['413515','VENTA INSUMOS MEDICOS','CREDIT',4,'4135','REVENUE'],
  ['4140','VENTA DE SERVICIOS','CREDIT',3,'41','REVENUE'],
  ['414005','CONSULTAS VETERINARIAS','CREDIT',4,'4140','REVENUE'],
  ['414010','CIRUGIAS','CREDIT',4,'4140','REVENUE'],
  ['414015','LABORATORIO Y DIAGNOSTICO','CREDIT',4,'4140','REVENUE'],
  ['42','NO OPERACIONALES','CREDIT',2,'4','REVENUE'],['4210','FINANCIEROS','CREDIT',3,'42','REVENUE'],
  ['4250','RECUPERACIONES','CREDIT',3,'42','REVENUE'],
  ['5','GASTOS','DEBIT',1,null,'EXPENSE'],['51','OPERACIONALES DE ADMINISTRACION','DEBIT',2,'5','EXPENSE'],
  ['5105','GASTOS DE PERSONAL','DEBIT',3,'51','EXPENSE'],['5110','HONORARIOS','DEBIT',3,'51','EXPENSE'],
  ['5115','IMPUESTOS','DEBIT',3,'51','EXPENSE'],['5120','ARRENDAMIENTOS','DEBIT',3,'51','EXPENSE'],
  ['5125','CONTRIBUCIONES','DEBIT',3,'51','EXPENSE'],['5130','SEGUROS','DEBIT',3,'51','EXPENSE'],
  ['5135','SERVICIOS','DEBIT',3,'51','EXPENSE'],['5140','GASTOS LEGALES','DEBIT',3,'51','EXPENSE'],
  ['5145','MANTENIMIENTO Y REPARACIONES','DEBIT',3,'51','EXPENSE'],
  ['5155','GASTOS DE VIAJE','DEBIT',3,'51','EXPENSE'],['5195','DIVERSOS','DEBIT',3,'51','EXPENSE'],
  ['52','OPERACIONALES DE VENTAS','DEBIT',2,'5','EXPENSE'],
  ['5205','GASTOS PERSONAL VENTAS','DEBIT',3,'52','EXPENSE'],
  ['5215','PUBLICIDAD Y PROPAGANDA','DEBIT',3,'52','EXPENSE'],
  ['53','NO OPERACIONALES','DEBIT',2,'5','EXPENSE'],['5305','FINANCIEROS','DEBIT',3,'53','EXPENSE'],
  ['6','COSTOS DE VENTAS','DEBIT',1,null,'COST'],['61','COSTO DE VENTAS Y PRESTACION','DEBIT',2,'6','COST'],
  ['6135','COSTO DE SERVICIOS','DEBIT',3,'61','COST'],
  ['6155','COSTO MERCANCIA VENDIDA','DEBIT',3,'61','COST'],
];

// Vendors (12)
const VENDORS = [
  ['MSD Salud Animal Colombia SAS','MSD Animal Health','9001234561','1','ventas.veterinaria@msd.com','(601) 7435000','Cra 7 # 71-21 Torre B','Bogota D.C.','Cundinamarca'],
  ['Bayer SA Salud Animal','Bayer AgriSalud','8600112342','5','info.bayervet@bayer.com','(601) 4253000','Cra 53 # 108-50','Bogota D.C.','Cundinamarca'],
  ['Royal Canin de Colombia SAS','Royal Canin','9001456783','7','pedidos@royalcanin.com.co','(601) 6000100','Autopista Norte Km 7','Bogota D.C.','Cundinamarca'],
  ['Vecol SA','Vecol','8990000014','3','ventas@vecol.com.co','(601) 5423000','Cra 7a Bis # 132-28','Bogota D.C.','Cundinamarca'],
  ['Hills Pet Nutrition Colombia SA','Hills Science Diet','9001567894','2','hills.co@hillspet.com','(601) 3200200','Cll 100 # 8A-49 Of 1102','Bogota D.C.','Cundinamarca'],
  ['Lavet Colombia SAS','Lavet Lab','9001678905','8','compras@lavetcolombia.com','(601) 2340055','Zona Industrial Cll 17 # 33-65','Bogota D.C.','Cundinamarca'],
  ['Intramed Colombia SAS','Intramed','9001789016','4','pedidos@intramed.com.co','(604) 3542200','Cra 48 # 34-50','Medellin','Antioquia'],
  ['Purina Colombia SAS','Purina - Nestle','8600065898','6','servicio.cliente@nestle.com.co','(601) 5750000','Cll 113 # 7-80','Bogota D.C.','Cundinamarca'],
  ['Servimedico Veterinario SAS','ServimeVet','9001890127','9','ventas@servicovet.com','(601) 7812300','Cll 13 # 18-24 Local 5','Bogota D.C.','Cundinamarca'],
  ['Nutraceutical Veterinary Colombia SAS','NutriVet','9001901238','0','info@nutrivet.com.co','(601) 9023400','Cra 15 # 95-45 Of 201','Bogota D.C.','Cundinamarca'],
  ['Zoetis Colombia SAS','Zoetis','9002345670','3','info@zoetis.com.co','(601) 7456000','Cll 93 # 11A-13 Of 501','Bogota D.C.','Cundinamarca'],
  ['Virbac Colombia SAS','Virbac','9002456781','7','ventas@virbac.com.co','(601) 2567890','Cra 19A # 84-14 Of 302','Bogota D.C.','Cundinamarca'],
];

// Customers (25)
const CUSTOMERS_CO = [
  ['Clinica Veterinaria Amigos del Parque SAS','VetParque','NIT','9002001231','5','contacto@vetparque.com.co','318 5001234','Cra 11 # 84-09','Bogota D.C.','Cundinamarca'],
  ['Granja Avicola San Juan SAS','Granja San Juan','NIT','8001002342','3','gerencia@granjasanjuan.com','312 4002341','Km 12 Via Zipaquira','Zipaquira','Cundinamarca'],
  ['Hacienda La Esperanza SAS','Hacienda La Esperanza','NIT','8001103453','7','admin@haciendalae.com','310 3003452','Km 30 Via Villeta','Villeta','Cundinamarca'],
  ['Pet Shop Peluditos Felices SAS','Peluditos Felices','NIT','9002204564','1','pedidos@peluditosfelices.co','313 2004563','Cll 147 # 17-52','Bogota D.C.','Cundinamarca'],
  ['Maria Lucia Garcia Perez',null,'CC','52456789',null,'mlgarcia@gmail.com','315 1005678','Cll 134 # 12-25 Apto 301','Bogota D.C.','Cundinamarca'],
  ['Carlos Andres Perez Molina',null,'CC','79345678',null,'caperez@hotmail.com','317 2006789','Cra 7 # 55-30 Apto 502','Bogota D.C.','Cundinamarca'],
  ['Andrea Sofia Ramirez Torres',null,'CC','1020345678',null,'aramirez@gmail.com','320 3007890','Cll 72 # 22-10 Casa 4','Bogota D.C.','Cundinamarca'],
  ['Zoonosis Alcaldia de Bogota','UAESPNN Bogota','NIT','8990046558','2','zoonosis@bogota.gov.co','(601) 3693003','Cll 26 # 29-50 CAN','Bogota D.C.','Cundinamarca'],
  ['Agropecuaria El Trebol SAS','El Trebol','NIT','9003001231','4','admin@eltrebol.com.co','310 8001234','Km 5 Via La Calera','La Calera','Cundinamarca'],
  ['Hospital Veterinario del Norte SAS','HVN','NIT','9003112342','6','info@hvnorte.com','311 8002345','Cra 15 # 127-40','Bogota D.C.','Cundinamarca'],
  ['Criadero Yorkshire El Prado SAS','Criadero El Prado','NIT','9003223453','8','contacto@yorkshireprado.com','312 8003456','Cll 200 # 45-12','Bogota D.C.','Cundinamarca'],
  ['Granja Porcina El Refugio SAS','El Refugio','NIT','9003334564','0','gerencia@granjarefugio.com','313 8004567','Km 15 Via Funza','Funza','Cundinamarca'],
  ['Clinica VetSalud Express SAS','VetSalud','NIT','9003445675','2','citas@vetsalud.co','314 8005678','Cra 68 # 12-51','Bogota D.C.','Cundinamarca'],
  ['Fundacion Proteccion Animal Bogota','FPAB','NIT','9003556786','4','fundacion@fpab.org','315 8006789','Cll 45 # 28-90','Bogota D.C.','Cundinamarca'],
  ['Ganaderia Los Alpes SAS','Los Alpes','NIT','9003667897','6','admin@losalpes.com.co','316 8007890','Km 40 Via Tunja','Ventaquemada','Boyaca'],
  ['Pet Center Mall SAS','Pet Center','NIT','9003778908','8','compras@petcenter.co','317 8008901','CC Titan Plaza Local 345','Bogota D.C.','Cundinamarca'],
  ['Eco Granja Organica SAS','Eco Granja','NIT','9003889019','0','info@ecogranja.co','318 8009012','Km 8 Via Chia','Chia','Cundinamarca'],
  ['Juan Pablo Moreno Silva',null,'CC','1032456789',null,'jpmoreno@outlook.com','319 9001234','Cra 30 # 45-12 Casa 8','Bogota D.C.','Cundinamarca'],
  ['Diana Marcela Castro Rios',null,'CC','39876543',null,'dmcastro@gmail.com','320 9002345','Cll 80 # 11-35 Apto 701','Bogota D.C.','Cundinamarca'],
  ['Santiago Herrera Duque',null,'CC','80123456',null,'sherrera@yahoo.com','321 9003456','Cra 50 # 30-15','Medellin','Antioquia'],
  ['Clinica Veterinaria Patitas SAS','Patitas','NIT','9004001230','5','admin@patitas.co','322 9004567','Cll 63 # 15-30','Cali','Valle del Cauca'],
  ['Alejandra Fernandez Ruiz',null,'CC','1098765432',null,'afernandez@gmail.com','323 9005678','Cra 15 # 93-20 Apto 205','Bogota D.C.','Cundinamarca'],
  ['Agroveterinaria del Llano SAS','AgroLlano','NIT','9004112341','7','ventas@agrollano.com','324 9006789','Cra 40 # 7-25','Villavicencio','Meta'],
  ['Roberto Andres Suarez Pena',null,'CC','71234567',null,'rasuarez@hotmail.com','325 9007890','Cll 10 # 25-40','Bucaramanga','Santander'],
  ['Laura Valentina Ortiz Mesa',null,'CC','1045678901',null,'lvortiz@gmail.com','326 9008901','Cra 7 # 180-25 Apto 102','Bogota D.C.','Cundinamarca'],
];

// Employee parties (15)
const EMP_PARTIES = [
  ['Ana Maria Rodriguez Ospina','39456781','ana.rodriguez@gvmvet.com','313 4001111','Bogota D.C.'],
  ['Carlos Alberto Martinez Rueda','79567892','carlos.martinez@gvmvet.com','315 4002222','Bogota D.C.'],
  ['Luisa Fernanda Hernandez Vargas','1019234563','luisa.hernandez@gvmvet.com','317 4003333','Bogota D.C.'],
  ['Diego Alejandro Torres Medina','80234564','diego.torres@gvmvet.com','310 4004444','Bogota D.C.'],
  ['Sandra Patricia Lopez Jimenez','52345675','sandra.lopez@gvmvet.com','312 4005555','Bogota D.C.'],
  ['Miguel Angel Garcia Suarez','79678986','miguel.garcia@gvmvet.com','320 4006666','Bogota D.C.'],
  ['Valentina Cruz Mejia','1023456787','valentina.cruz@gvmvet.com','311 4007777','Bogota D.C.'],
  ['Andres Felipe Gomez Parra','1018901238','andres.gomez@gvmvet.com','314 4008888','Bogota D.C.'],
  ['Laura Jimena Sanchez Roa','1015012349','laura.sanchez@gvmvet.com','316 4009999','Bogota D.C.'],
  ['Juan Esteban Perez Castro','1014523460','juan.perez@gvmvet.com','318 4010100','Bogota D.C.'],
  ['Camila Andrea Ruiz Vega','1022345671','camila.ruiz@gvmvet.com','319 4011111','Bogota D.C.'],
  ['Felipe Andres Morales Diaz','80456782','felipe.morales@gvmvet.com','321 4012222','Bogota D.C.'],
  ['Natalia Esperanza Roa Luna','39567893','natalia.roa@gvmvet.com','322 4013333','Bogota D.C.'],
  ['Oscar Ivan Duarte Gil','79789004','oscar.duarte@gvmvet.com','323 4014444','Bogota D.C.'],
  ['Paola Andrea Bernal Rios','1016789015','paola.bernal@gvmvet.com','324 4015555','Bogota D.C.'],
];

// Products (33)
const PRODUCTS = [
  ['MED-001','Vacuna Rabia Canina 1ml (Nobivac)','GOOD','UND',12000,28000,50,'Vacuna antirrabica inactivada para caninos y felinos.','IVA_0'],
  ['MED-002','Vacuna Moquillo+Parvo+Hepatitis (Nobivac DHPPi)','GOOD','UND',18000,42000,40,'Vacuna polivalente canina.','IVA_0'],
  ['MED-003','Ivermectina 1% Inyectable 50ml','GOOD','UND',22000,48000,30,'Antiparasitario inyectable de amplio espectro.','IVA_0'],
  ['MED-004','Amoxicilina 500mg Tabletas x14','GOOD','UND',8500,22000,60,'Antibiotico de amplio espectro.','IVA_0'],
  ['MED-005','Meloxicam 15mg/ml Inyectable 10ml','GOOD','UND',32000,68000,25,'AINE veterinario.','IVA_0'],
  ['MED-006','Tramadol 50mg/ml Inyectable 10ml','GOOD','UND',28000,58000,20,'Analgesico opioide.','IVA_0'],
  ['MED-007','Dexametasona 4mg/ml Inyectable 100ml','GOOD','UND',35000,72000,20,'Corticosteroide de larga accion.','IVA_0'],
  ['MED-008','Frontline Spot-On Perros M x3 pip','GOOD','UND',38000,85000,40,'Antipulgas y antigarrapatas topico.','IVA_0'],
  ['ALI-001','Pro Plan Adulto Pollo x15kg','GOOD','UND',148000,198000,15,'Alimento seco premium para perros adultos.','IVA_5'],
  ['ALI-002','Royal Canin Mini Puppy x8kg','GOOD','UND',118000,165000,20,'Alimento para cachorros razas pequenas.','IVA_5'],
  ['ALI-003','Pedigree Adulto Razas Grandes x25kg','GOOD','UND',95000,138000,10,'Alimento completo perros adultos.','IVA_5'],
  ['ALI-004','Hills Prescription Diet k/d Canino x4kg','GOOD','UND',98000,178000,10,'Dieta terapeutica renal canina.','IVA_0'],
  ['ALI-005','Whiskas Atun y Verduras Lata 400g','GOOD','UND',3200,6500,100,'Alimento humedo gatos adultos.','IVA_5'],
  ['ALI-006','Purina Dog Chow Razas Medianas x15kg','GOOD','UND',82000,118000,12,'Alimento con vitaminas balanceadas.','IVA_5'],
  ['INS-001','Jeringas 3ml c/aguja 21G x100','GOOD','CJ',18000,35000,20,'Jeringas desechables esteriles.','IVA_19'],
  ['INS-002','Cateter IV Abbocath 22G x50','GOOD','CJ',42000,80000,10,'Cateter intravenoso de teflon 22G.','IVA_19'],
  ['INS-003','Solucion Ringer Lactato 500ml','GOOD','UND',4500,9500,50,'Solucion de Hartmann para fluidoterapia.','IVA_0'],
  ['INS-004','Guantes Examen Nitrilo Talla L x100','GOOD','CJ',15000,28000,15,'Guantes de nitrilo sin polvo.','IVA_19'],
  ['INS-005','Bisturi Desechable #22 x10','GOOD','CJ',12000,25000,10,'Bisturi con hoja de acero inoxidable.','IVA_19'],
  ['INS-006','Collar Isabelino Plastico Talla M','GOOD','UND',8000,18000,30,'Collar protector post-quirurgico.','IVA_19'],
  ['EQU-001','Termometro Digital Veterinario','GOOD','UND',22000,48000,5,'Termometro electronico rectal/axilar.','IVA_19'],
  ['SVC-001','Consulta Veterinaria General','SERVICE','UND',0,60000,0,'Consulta clinica: anamnesis, examen fisico.','IVA_0'],
  ['SVC-002','Consulta Especialidad (Cardio/Derm/Neuro)','SERVICE','UND',0,120000,0,'Consulta con medico especialista.','IVA_0'],
  ['SVC-003','Cirugia Castracion Canino (OHE o ORQ)','SERVICE','UND',0,380000,0,'Incluye anestesia general.','IVA_0'],
  ['SVC-004','Cirugia Castracion Felino','SERVICE','UND',0,280000,0,'OHE o ORQ felina con anestesia.','IVA_0'],
  ['SVC-005','Profilaxis Dental (Limpieza Dental)','SERVICE','UND',0,220000,0,'Detartraje bajo anestesia.','IVA_0'],
  ['SVC-006','Hospitalizacion Diaria (24h)','SERVICE','UND',0,95000,0,'Monitoreo, fluidoterapia, medicacion.','IVA_0'],
  ['SVC-007','Bano y Peluqueria Canino Raza Mediana','SERVICE','UND',0,85000,0,'Bano, secado, corte unias y pelo.','IVA_19'],
  ['SVC-008','Laboratorio: Hemograma Completo','SERVICE','UND',0,75000,0,'CBC con diferencial y plaquetas.','IVA_0'],
  ['SVC-009','Radiografia Digital (2 Vistas)','SERVICE','UND',0,145000,0,'Rx digital en 2 proyecciones.','IVA_0'],
  ['SVC-010','Ecografia Abdominal','SERVICE','UND',0,180000,0,'Ecografia abdominal completa.','IVA_0'],
  ['MED-009','Ketamina 50mg/ml Inyectable 10ml','GOOD','UND',45000,95000,15,'Anestesico disociativo uso veterinario.','IVA_0'],
  ['MED-010','Cefalexina 500mg Tabletas x20','GOOD','UND',12000,32000,40,'Cefalosporina primera generacion.','IVA_0'],
];

// Employees (15)
const EMPLOYEES = [
  ['INDEFINIDO','2023-03-01',null,4000000,true,'1','TRANSFERENCIA','Bancolombia','AHORROS','695123456789'],
  ['INDEFINIDO','2022-08-15',null,3500000,true,'2','TRANSFERENCIA','Davivienda','AHORROS','001923456789'],
  ['INDEFINIDO','2024-01-10',null,1800000,true,'2','TRANSFERENCIA','BBVA','AHORROS','0172345678'],
  ['FIJO','2025-01-01','2025-12-31',2800000,true,'1','TRANSFERENCIA','Banco Bogota','CORRIENTE','213345678'],
  ['INDEFINIDO','2023-11-01',null,1500000,true,'1','TRANSFERENCIA','Nequi','AHORROS','3134005555'],
  ['PRESTACION_SERVICIOS','2025-06-01','2026-05-31',6000000,false,'3','TRANSFERENCIA','Bancolombia','AHORROS','695678901234'],
  ['FIJO','2025-09-01','2026-02-28',3200000,true,'2','TRANSFERENCIA','Davivienda','AHORROS','001789012345'],
  ['OBRA_LABOR','2025-10-15',null,1600000,true,'3','EFECTIVO',null,null,null],
  ['FIJO','2026-01-15','2026-04-15',1400000,true,'1','TRANSFERENCIA','Nequi','AHORROS','3164009999'],
  ['INDEFINIDO','2024-06-01',null,1160000,true,'1','TRANSFERENCIA','Banco Bogota','AHORROS','213890123'],
  ['INDEFINIDO','2025-03-01',null,2200000,true,'2','TRANSFERENCIA','Bancolombia','AHORROS','695234567890'],
  ['FIJO','2025-07-01','2026-06-30',1800000,true,'1','TRANSFERENCIA','Davivienda','AHORROS','001890123456'],
  ['INDEFINIDO','2024-09-01',null,2600000,true,'2','TRANSFERENCIA','BBVA','AHORROS','0173456789'],
  ['APRENDIZAJE','2025-11-01','2026-10-31',1160000,true,'1','TRANSFERENCIA','Nequi','AHORROS','3155001111'],
  ['OBRA_LABOR','2026-01-01',null,1400000,true,'3','EFECTIVO',null,null,null],
];

async function run() {
  console.log('GVM Corp ERP - Seed Completo\n');
  await clean();

  // ═══ PHASE 1: Chart of Accounts ═══
  console.log('\n-- PHASE 1: Chart of Accounts --');
  const acctIdMap = {};
  const acctRows = ACCTS.map((a, i) => {
    const id = uid('a0', i+1);
    acctIdMap[a[0]] = id;
    return { id, tenant_id:T, code:a[0], name:a[1], nature:a[2], level:a[3], parent_id:null, type:a[5], is_active:true, balance:0 };
  });
  // Set parent_ids
  for (let i=0; i<ACCTS.length; i++) {
    if (ACCTS[i][4]) acctRows[i].parent_id = acctIdMap[ACCTS[i][4]] || null;
  }
  await ins('chart_accounts', acctRows);

  // ═══ PHASE 2: Warehouses + Locations ═══
  console.log('\n-- PHASE 2: Warehouses + Locations --');
  await ins('warehouses', [
    { id:WH[0], tenant_id:T, code:'BOD-PRINCIPAL', name:'Bodega Principal' },
    { id:WH[1], tenant_id:T, code:'BOD-MEDICAMENTOS', name:'Bodega Medicamentos' },
    { id:WH[2], tenant_id:T, code:'BOD-FRIO', name:'Bodega Cadena de Frio' },
  ]);
  const locs = [];
  let locN = 1;
  // BOD-PRINCIPAL: 4 pasillos x 5 estantes x 3 posiciones = 60
  for (let a=1; a<=4; a++) for (let r=1; r<=5; r++) for (let p=1; p<=3; p++) {
    locs.push({ id:uid('a1',locN++), warehouse_id:WH[0], aisle:`P${a}`, rack:`E${r}`, position:String(p), capacity:100, is_active:true });
  }
  // BOD-MEDICAMENTOS: 2 pasillos x 3 estantes x 2 posiciones = 12
  for (let a=1; a<=2; a++) for (let r=1; r<=3; r++) for (let p=1; p<=2; p++) {
    locs.push({ id:uid('a1',locN++), warehouse_id:WH[1], aisle:`M${a}`, rack:`E${r}`, position:String(p), capacity:50, is_active:true });
  }
  // BOD-FRIO: 2 pasillos x 2 estantes x 2 posiciones = 8
  for (let a=1; a<=2; a++) for (let r=1; r<=2; r++) for (let p=1; p<=2; p++) {
    locs.push({ id:uid('a1',locN++), warehouse_id:WH[2], aisle:`F${a}`, rack:`E${r}`, position:String(p), capacity:30, is_active:true });
  }
  await ins('warehouse_locations', locs);

  // ═══ PHASE 3: Parties ═══
  console.log('\n-- PHASE 3: Parties --');
  const vendorIds = VENDORS.map((_,i) => uid('aa',i+1));
  const vendorRows = VENDORS.map((v,i) => ({
    id:vendorIds[i], tenant_id:T, party_type:'COMPANY', legal_name:v[0], trade_name:v[1],
    doc_type:'NIT', doc_number:v[2], nit:v[2], dv:v[3], email:v[4], phone:v[5],
    is_customer:false, is_vendor:true, address:v[6], city:v[7], department:v[8], country:'CO'
  }));
  await ins('parties', vendorRows);

  const custIds = CUSTOMERS_CO.map((_,i) => uid('ab',i+1));
  const custRows = CUSTOMERS_CO.map((c,i) => {
    const isComp = c[2] === 'NIT';
    return {
      id:custIds[i], tenant_id:T, party_type:isComp?'COMPANY':'PERSON', legal_name:c[0], trade_name:c[1],
      doc_type:c[2], doc_number:c[3], nit:isComp?c[3]:null, dv:c[4], email:c[5], phone:c[6],
      is_customer:true, is_vendor:false, address:c[7], city:c[8], department:c[9], country:'CO'
    };
  });
  await ins('parties', custRows);

  const empPartyIds = EMP_PARTIES.map((_,i) => uid('ac',i+1));
  const empPartyRows = EMP_PARTIES.map((e,i) => ({
    id:empPartyIds[i], tenant_id:T, party_type:'PERSON', legal_name:e[0], doc_type:'CC', doc_number:e[1],
    email:e[2], phone:e[3], is_customer:false, is_vendor:false, city:e[4], department:'Cundinamarca', country:'CO'
  }));
  await ins('parties', empPartyRows);

  // ═══ PHASE 4: Employees ═══
  console.log('\n-- PHASE 4: Employees --');
  const empIds = EMPLOYEES.map((_,i) => uid('bc',i+1));
  const empRows = EMPLOYEES.map((e,i) => ({
    id:empIds[i], tenant_id:T, party_id:empPartyIds[i], contract_type:e[0], start_date:e[1], end_date:e[2],
    salary:e[3], transport_allowance:e[4], risk_level:e[5], payment_method:e[6],
    bank_name:e[7], bank_account_type:e[8], bank_account_number:e[9], status:'ACTIVE'
  }));
  await ins('employees', empRows);

  // ═══ PHASE 5: Products ═══
  console.log('\n-- PHASE 5: Products --');
  const prodIds = PRODUCTS.map((_,i) => uid('bb',i+1));
  const prodRows = PRODUCTS.map((p,i) => ({
    id:prodIds[i], tenant_id:T, sku:p[0], name:p[1], type:p[2], uom:p[3],
    cost:p[4], selling_price:p[5], min_stock:p[6], description:p[7], tax_category:p[8], status:'ACTIVE'
  }));
  await ins('products', prodRows);

  // ═══ PHASE 6: Treasury Accounts ═══
  console.log('\n-- PHASE 6: Treasury Accounts --');
  const tAccts = [
    { id:uid('bd',1), tenant_id:T, name:'Bancolombia Cta Cte Principal', type:'BANK', bank_name:'Bancolombia', account_number:'695-123456-78', balance:85420000 },
    { id:uid('bd',2), tenant_id:T, name:'Davivienda Cta Ahorros Nomina', type:'BANK', bank_name:'Davivienda', account_number:'0019-234567-89', balance:22180000 },
    { id:uid('bd',3), tenant_id:T, name:'Caja General Clinica', type:'CASH', balance:3250000 },
    { id:uid('bd',4), tenant_id:T, name:'Nequi Empresarial', type:'BANK', bank_name:'Nequi', account_number:'300-1234567', balance:4850000 },
  ];
  await ins('treasury_accounts', tAccts);

  // ═══ PHASE 7: Documents ═══
  console.log('\n-- PHASE 7: Documents --');
  const docs = [];
  const docLines = [];
  let docN = 1, dlN = 1;
  const goodProds = PRODUCTS.map((p,i) => ({id:prodIds[i],...p})).filter(p => p[2]==='GOOD');
  const svcProds = PRODUCTS.map((p,i) => ({id:prodIds[i],...p})).filter(p => p[2]==='SERVICE');
  const rng = (min,max) => Math.floor(Math.random()*((max-min)+1))+min;
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  // 80 Invoices (Oct 2025 - Mar 2026)
  for (let i=0; i<80; i++) {
    const id = uid('d0', docN++);
    const mo = 10 + (i % 6); // 10,11,12,1,2,3
    const yr = mo > 9 ? 2025 : 2026;
    const realMo = mo > 12 ? mo - 12 : mo;
    const day = rng(1, 28);
    const cust = custIds[i % custIds.length];
    const numLines = rng(2, 5);
    let sub = 0, tax = 0;
    for (let j=0; j<numLines; j++) {
      const prod = pick([...goodProds, ...svcProds]);
      const qty = prod[2]==='SERVICE' ? rng(1,3) : rng(1,20);
      const price = prod[5];
      const lt = qty * price;
      const rate = prod[8]==='IVA_19' ? 0.19 : prod[8]==='IVA_5' ? 0.05 : 0;
      sub += lt; tax += Math.round(lt * rate);
      docLines.push({ id:uid('da',dlN++), tenant_id:T, document_id:id, product_id:prod.id, description:prod[1], qty, unit_price:price, line_total:lt, tax_config:{rate} });
    }
    const tot = sub + tax;
    const paid = i < 30;
    docs.push({ id, tenant_id:T, doc_type:'INVOICE', number:`FV-${yr}-${String(i+1).padStart(4,'0')}`, party_id:cust,
      issue_date:d(yr,realMo,day), due_date:d(yr,realMo,Math.min(day+30,28)), currency:'COP',
      subtotal:sub, taxes:tax, total:tot, status:paid?'ACCEPTED':'SENT', balance:paid?0:tot });
  }

  // 40 Quotations
  for (let i=0; i<40; i++) {
    const id = uid('d0', docN++);
    const mo = rng(1,3); const day = rng(1,28);
    const cust = custIds[i % custIds.length];
    const numLines = rng(2,4);
    let sub = 0, tax = 0;
    for (let j=0; j<numLines; j++) {
      const prod = pick([...goodProds, ...svcProds]);
      const qty = rng(1,10); const price = prod[5]; const lt = qty*price;
      const rate = prod[8]==='IVA_19'?0.19:prod[8]==='IVA_5'?0.05:0;
      sub += lt; tax += Math.round(lt*rate);
      docLines.push({ id:uid('da',dlN++), tenant_id:T, document_id:id, product_id:prod.id, description:prod[1], qty, unit_price:price, line_total:lt, tax_config:{rate} });
    }
    const tot = sub+tax;
    const st = i<10?'ACCEPTED':i<20?'SENT':'DRAFT';
    docs.push({ id, tenant_id:T, doc_type:'QUOTATION', number:`COT-2026-${String(i+1).padStart(4,'0')}`, party_id:cust,
      issue_date:d(2026,mo,day), due_date:d(2026,mo,Math.min(day+15,28)), currency:'COP',
      subtotal:sub, taxes:tax, total:tot, status:st, balance:tot });
  }

  // 30 Sales Orders
  for (let i=0; i<30; i++) {
    const id = uid('d0', docN++);
    const mo = rng(1,3); const day = rng(1,28);
    const cust = custIds[i % custIds.length];
    const numLines = rng(2,4);
    let sub = 0, tax = 0;
    for (let j=0; j<numLines; j++) {
      const prod = pick(goodProds);
      const qty = rng(5,30); const price = prod[5]; const lt = qty*price;
      const rate = prod[8]==='IVA_19'?0.19:prod[8]==='IVA_5'?0.05:0;
      sub += lt; tax += Math.round(lt*rate);
      docLines.push({ id:uid('da',dlN++), tenant_id:T, document_id:id, product_id:prod.id, description:prod[1], qty, unit_price:price, line_total:lt, tax_config:{rate} });
    }
    const tot = sub+tax;
    docs.push({ id, tenant_id:T, doc_type:'SALES_ORDER', number:`OV-2026-${String(i+1).padStart(4,'0')}`, party_id:cust,
      issue_date:d(2026,mo,day), due_date:d(2026,mo,Math.min(day+30,28)), currency:'COP',
      subtotal:sub, taxes:tax, total:tot, status:i<15?'ACCEPTED':'SENT', balance:tot });
  }

  // 10 Credit Notes
  for (let i=0; i<10; i++) {
    const id = uid('d0', docN++);
    const origDoc = docs[i]; // Reference first 10 invoices
    const sub = Math.round(origDoc.subtotal * 0.2);
    const tax = Math.round(origDoc.taxes * 0.2);
    const tot = sub+tax;
    docLines.push({ id:uid('da',dlN++), tenant_id:T, document_id:id, product_id:prodIds[0], description:'Devolucion parcial', qty:1, unit_price:sub, line_total:sub, tax_config:{rate:0} });
    docs.push({ id, tenant_id:T, doc_type:'CREDIT_NOTE', number:`NC-2026-${String(i+1).padStart(4,'0')}`, party_id:origDoc.party_id,
      issue_date:d(2026,2,rng(1,28)), due_date:null, currency:'COP', subtotal:sub, taxes:tax, total:tot, status:'ACCEPTED', balance:0, parent_id:origDoc.id });
  }

  // 20 Vendor Bills
  for (let i=0; i<20; i++) {
    const id = uid('d0', docN++);
    const mo = rng(1,3); const day = rng(1,28);
    const vendor = vendorIds[i % vendorIds.length];
    const numLines = rng(2,4);
    let sub = 0, tax = 0;
    for (let j=0; j<numLines; j++) {
      const prod = pick(goodProds);
      const qty = rng(10,50); const price = prod[4]; const lt = qty*price;
      sub += lt; tax += Math.round(lt*0.19);
      docLines.push({ id:uid('da',dlN++), tenant_id:T, document_id:id, product_id:prod.id, description:`Compra: ${prod[1]}`, qty, unit_price:price, line_total:lt, tax_config:{rate:0.19} });
    }
    const tot = sub+tax;
    docs.push({ id, tenant_id:T, doc_type:'VENDOR_BILL', number:`FC-2026-${String(i+1).padStart(4,'0')}`, party_id:vendor,
      issue_date:d(2026,mo,day), due_date:d(2026,mo,Math.min(day+30,28)), currency:'COP',
      subtotal:sub, taxes:tax, total:tot, status:i<8?'ACCEPTED':'SENT', balance:i<8?0:tot });
  }

  await batch('documents', docs);
  await batch('document_lines', docLines);

  // ═══ PHASE 9: Purchase Orders ═══
  console.log('\n-- PHASE 9: Purchase Orders --');
  const pos = [];
  const poLines = [];
  for (let i=0; i<30; i++) {
    const poId = uid('b5', i+1);
    const mo = rng(1,3); const day = rng(1,28);
    const vendor = vendorIds[i % vendorIds.length];
    const numLines = rng(2,4);
    let sub = 0, taxT = 0;
    for (let j=0; j<numLines; j++) {
      const prod = pick(goodProds);
      const qty = rng(10,100);
      const uc = prod[4];
      const lt = qty * uc;
      sub += lt; taxT += Math.round(lt * 0.19);
      poLines.push({ id:uid('b6',i*4+j+1), order_id:poId, product_id:prod.id, qty, unit_cost:uc, tax_rate:0.19, qty_received:i<15?qty:0 });
    }
    const st = i<10?'RECEIVED':i<20?'APPROVED':'DRAFT';
    pos.push({ id:poId, tenant_id:T, supplier_id:vendor, warehouse_id:WH[i%3<2?1:2],
      status:st, order_date:d(2026,mo,day), expected_delivery:d(2026,mo,Math.min(day+14,28)),
      subtotal:sub, tax_total:taxT, total:sub+taxT, notes:`OC proveedor ${i+1}`, created_by:A });
  }
  await ins('purchase_orders', pos);
  await ins('purchase_order_lines', poLines);

  // ═══ PHASE 10: Product Lots + Inventory Movements ═══
  console.log('\n-- PHASE 10: Lots + Inventory --');
  const lots = [];
  const movements = [];
  const goodProdsSub = goodProds.slice(0, 21); // Physical products only
  for (let i=0; i<50; i++) {
    const prod = goodProdsSub[i % goodProdsSub.length];
    const wh = i % 3 === 0 ? WH[2] : i % 2 === 0 ? WH[1] : WH[0];
    const lotId = uid('b7', i+1);
    lots.push({ id:lotId, tenant_id:T, product_id:prod.id, warehouse_id:wh,
      lot_number:`LOT-${String(i+1).padStart(4,'0')}`, batch_code:`BCH-${2025+Math.floor(i/25)}-${String(i+1).padStart(3,'0')}`,
      qty:rng(10,100), cost:prod[4], manufacture_date:d(2025,6+Math.floor(i/10),1),
      expiration_date:d(2027,6+Math.floor(i/10),1), supplier_id:vendorIds[i%vendorIds.length], status:'ACTIVE' });
  }
  await ins('product_lots', lots);

  // Initial stock IN movements
  for (let i=0; i<goodProdsSub.length; i++) {
    const prod = goodProdsSub[i];
    const wh = i < 8 ? WH[1] : i < 14 ? WH[0] : WH[2];
    movements.push({ tenant_id:T, warehouse_id:wh, product_id:prod.id, type:'IN', qty:rng(20,120), cost:prod[4], occurred_at:'2025-10-01T00:00:00Z' });
    // Additional movements for variety
    movements.push({ tenant_id:T, warehouse_id:wh, product_id:prod.id, type:'IN', qty:rng(10,50), cost:prod[4], occurred_at:'2025-12-01T00:00:00Z' });
    movements.push({ tenant_id:T, warehouse_id:wh, product_id:prod.id, type:'OUT', qty:rng(5,30), cost:prod[4], occurred_at:'2026-01-15T00:00:00Z' });
    movements.push({ tenant_id:T, warehouse_id:wh, product_id:prod.id, type:'IN', qty:rng(15,60), cost:prod[4], occurred_at:'2026-02-01T00:00:00Z' });
    movements.push({ tenant_id:T, warehouse_id:wh, product_id:prod.id, type:'OUT', qty:rng(3,20), cost:prod[4], occurred_at:'2026-02-20T00:00:00Z' });
  }
  await batch('inventory_movements', movements);

  // ═══ PHASE 11: Journal Entries + Lines ═══
  console.log('\n-- PHASE 11: Journal Entries --');
  const je = [], jl = [];
  let jeN = 1, jlN = 1;
  // Generate entries for each month (Oct 2025 - Mar 2026 = 6 months)
  const months = [[2025,10],[2025,11],[2025,12],[2026,1],[2026,2],[2026,3]];
  for (const [yr,mo] of months) {
    const period = `${yr}-${String(mo).padStart(2,'0')}`;
    // 25 entries per month = 150 total
    for (let i=0; i<25; i++) {
      const jeId = uid('b9', jeN++);
      const day = rng(1,28);
      const desc = ['Venta productos','Compra insumos','Pago nomina','Pago arriendo','Ingreso servicios',
        'Pago proveedor','Cobro cliente','Depreciacion','Ajuste inventario','Gasto servicios publicos',
        'Comisiones ventas','Pago seguridad social','Venta alimentos','Ingreso laboratorio','Gasto transporte'][i%15];
      const amt = rng(200000, 15000000);
      je.push({ id:jeId, tenant_id:T, entry_date:d(yr,mo,day), description:`${desc} - ${period}`, number:`CE-${jeN-1}`, period, status:'POSTED' });
      // Debit line
      const debitAcct = acctIdMap[['6155','5105','5120','5135','1305','2205','1110','1592','1435','5135','5205','2370','6155','4140','5155'][i%15]];
      const creditAcct = acctIdMap[['4135','2205','2505','1110','1110','1110','1305','1592','1435','1110','2505','1110','1110','1305','1110'][i%15]];
      jl.push({ id:uid('ba',jlN++), tenant_id:T, entry_id:jeId, account_id:debitAcct, debit:amt, credit:0, description:desc });
      jl.push({ id:uid('ba',jlN++), tenant_id:T, entry_id:jeId, account_id:creditAcct, debit:0, credit:amt, description:desc });
      // Some entries have 3-4 lines (tax splits)
      if (i % 4 === 0) {
        const taxAmt = Math.round(amt * 0.19);
        jl.push({ id:uid('ba',jlN++), tenant_id:T, entry_id:jeId, account_id:acctIdMap['2404'], debit:0, credit:taxAmt, description:'IVA' });
        jl.push({ id:uid('ba',jlN++), tenant_id:T, entry_id:jeId, account_id:acctIdMap['2365'], debit:0, credit:Math.round(amt*0.025), description:'ReteFuente' });
      }
    }
  }
  await batch('journal_entries', je);
  await batch('journal_lines', jl);

  // ═══ PHASE 12: Treasury Transactions ═══
  console.log('\n-- PHASE 12: Treasury Transactions --');
  const ttx = [];
  for (let i=0; i<100; i++) {
    const mo = 10 + (i % 6); const yr = mo > 12 ? 2026 : 2025; const realMo = mo > 12 ? mo-12 : mo;
    const isReceipt = i % 3 !== 2;
    const amt = rng(100000, 12000000) * (isReceipt ? 1 : -1);
    ttx.push({ id:uid('db',i+1), tenant_id:T, account_id:tAccts[i%4].id,
      party_id:isReceipt ? custIds[i%custIds.length] : (i%5===0 ? null : vendorIds[i%vendorIds.length]),
      amount:amt, transaction_type:isReceipt?'RECEIPT':'PAYMENT', date:d(yr,realMo,rng(1,28)),
      description:isReceipt?`Recaudo cliente ${i+1}`:`Pago ${i%5===0?'gastos operacion':'proveedor'} ${i+1}`,
      reference_number:`REF-${String(i+1).padStart(4,'0')}`, is_reconciled:i<60 });
  }
  await ins('treasury_transactions', ttx);

  // ═══ PHASE 13: CRM ═══
  console.log('\n-- PHASE 13: CRM --');
  const leadStatuses = ['NEW','CONTACTED','QUALIFIED','CONVERTED','LOST'];
  const leadSources = ['REFERRAL','WEBSITE','COLD_CALL','EVENT','SOCIAL_MEDIA'];
  const leadNames = [
    ['Rodrigo Fuentes','Granja Porcina El Refugio','rfuentes@granjaerefugio.com','310 8001122','Interesado en programa vacunacion porcina mensual.'],
    ['Catalina Morales','Clinipet Bogota Sur','cmorales@clinipet.com','312 8002233','Busca proveedor de medicamentos al por mayor.'],
    ['Hector Mejia','Criadero Yorkshire El Prado','hmejia@yorkshireprado.com','314 8003344','Requiere desparasitacion trimestral.'],
    ['Adriana Vargas','Alcaldia de Chia - Zoonosis','avargas@chia.gov.co','(601) 8614333','Licitacion esterilizacion caninos callejeros.'],
    ['Roberto Torres','Finca Ganadera Torres','rtorres@fincatorres.com','315 8004455','500 cabezas ganado, plan sanitario anual.'],
    ['Claudia Restrepo','VetCare Medellin','crestrepo@vetcare.co','316 8005566','Cadena de 3 clinicas, busca proveedor de insumos.'],
    ['Andres Salazar','Acuicultura del Pacifico','asalazar@acuipacifico.com','317 8006677','Piscicultura 10 estanques, plan sanitario.'],
    ['Monica Rivas','PetLand Barranquilla','mrivas@petland.co','318 8007788','Tienda mascotas, interesada en marca propia.'],
    ['Felipe Ocampo','Zoo de Cali','focampo@zoocali.org','319 8008899','Convenio de servicios para 200+ animales exoticos.'],
    ['Gabriela Pinto','Alcaldia Soacha','gpinto@soacha.gov.co','320 8009900','Programa vacunacion antirrabica masiva.'],
    ['Luis Henao','Rancho La Sabana','lhenao@rancholasabana.com','321 8010011','Equinos: 40 caballos, plan preventivo.'],
    ['Natalie Duran','Happy Pets Bogota','nduran@happypets.co','322 8010122','E-commerce mascotas, alianza mayorista.'],
    ['Daniel Quintero','Granja Avicola El Sol','dquintero@avielcol.com','323 8010233','3000 aves, programa vacunacion y bioseguridad.'],
    ['Patricia Zuluaga','Centro Equino Los Andes','pzuluaga@centroequino.co','324 8010344','Club ecuestre, servicios veterinarios y nutricion.'],
    ['Oscar Mendez','Hacienda El Dorado','omendez@eldorado.co','325 8010455','Ganaderia doble proposito, 800 reses.'],
    ['Angela Cortes','Municipio Fusagasuga','acortes@fusagasuga.gov.co','326 8010566','Programa esterilizacion y desparasitacion municipal.'],
    ['Jorge Buitrago','Tienda Mascotas ZOO+','jbuitrago@zooplus.co','327 8010677','5 sucursales, necesita abastecimiento mensual.'],
    ['Sofia Cardenas','Lab VetDiag SAS','scardenas@vetdiag.co','328 8010788','Laboratorio clinico veterinario, alianza referidos.'],
    ['Miguel Rojas','FincaGAN Boyaca','mrojas@fincagan.co','329 8010899','Ovinos y caprinos, 200 animales.'],
    ['Isabella Torres','Pet Grooming Deluxe','itorres@petgrooming.co','330 8010900','Cadena grooming 4 sedes, insumos esteticos.'],
  ];
  const leadRows = leadNames.map((l,i) => ({
    id:uid('fa',i+1), tenant_id:T, name:l[0], company_name:l[1], email:l[2], phone:l[3],
    status:leadStatuses[i%5], source:leadSources[i%5], notes:l[4], assigned_to:A
  }));
  await ins('leads', leadRows);

  const oppStages = ['PROSPECTING','QUALIFICATION','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'];
  const oppNames = [
    ['Contrato Anual Granja Avicola San Juan',48000000,85,'PROPOSAL'],
    ['Licitacion Esterilizacion Canina Chia',45000000,60,'NEGOTIATION'],
    ['Programa Vacunacion Porcina El Refugio',12000000,70,'QUALIFICATION'],
    ['Convenio Servicio Tecnico VetParque',96000000,40,'PROSPECTING'],
    ['Plan Sanitario Finca Torres (500 reses)',28000000,75,'PROPOSAL'],
    ['Abastecimiento VetCare Medellin (3 sedes)',36000000,65,'NEGOTIATION'],
    ['Programa Acuicultura Pacifico',8000000,50,'QUALIFICATION'],
    ['Alianza PetLand Barranquilla',24000000,45,'PROSPECTING'],
    ['Convenio Zoo de Cali',72000000,30,'PROSPECTING'],
    ['Vacunacion Masiva Soacha',18000000,80,'CLOSED_WON'],
    ['Plan Equino Rancho La Sabana',15000000,90,'CLOSED_WON'],
    ['Mayorista Happy Pets E-commerce',42000000,55,'PROPOSAL'],
    ['Bioseguridad Avicola El Sol',22000000,35,'QUALIFICATION'],
    ['Centro Equino Los Andes',32000000,70,'NEGOTIATION'],
    ['Convenio Ganadero El Dorado',55000000,25,'CLOSED_LOST'],
  ];
  const oppRows = oppNames.map((o,i) => ({
    id:uid('fb',i+1), tenant_id:T, name:o[0], value:o[1], probability:o[2], stage:o[3],
    expected_close_date:d(2026,3+Math.floor(i/5),15),
    lead_id:i<4?uid('fa',i+1):null, party_id:i>=4?custIds[i%custIds.length]:null, assigned_to:A,
    description:`Oportunidad comercial: ${o[0]}`
  }));
  await ins('crm_opportunities', oppRows);

  // ═══ PHASE 14: Payroll ═══
  console.log('\n-- PHASE 14: Payroll --');
  // Attendance: 10 active employees x 22 workdays x 9 months (Jul 2025 - Mar 2026) = ~1980
  const attendance = [];
  const activeEmps = empIds.slice(0, 10);
  for (const [yr,mo] of [[2025,7],[2025,8],[2025,9],[2025,10],[2025,11],[2025,12],[2026,1],[2026,2],[2026,3]]) {
    for (let day=1; day<=28; day++) {
      const dow = new Date(yr, mo-1, day).getDay();
      if (dow === 0 || dow === 6) continue; // Skip weekends
      for (const empId of activeEmps) {
        const r = Math.random();
        const status = r < 0.85 ? 'PRESENT' : r < 0.93 ? 'LATE' : r < 0.97 ? 'ABSENT' : 'HOLIDAY';
        const ot = status === 'PRESENT' && Math.random() < 0.15 ? rng(1,4) : 0;
        const night = status === 'PRESENT' && Math.random() < 0.05 ? rng(1,3) : 0;
        attendance.push({ tenant_id:T, employee_id:empId, work_date:d(yr,mo,day),
          check_in:status!=='ABSENT'?`${d(yr,mo,day)}T${status==='LATE'?'08':'07'}:${rng(0,59).toString().padStart(2,'0')}:00Z`:null,
          check_out:status!=='ABSENT'?`${d(yr,mo,day)}T${17+ot}:${rng(0,59).toString().padStart(2,'0')}:00Z`:null,
          status, overtime_hours:ot, night_hours:night, sunday_hours:0 });
      }
    }
  }
  await batch('payroll_attendance', attendance);

  // Overtime requests
  const otReqs = [];
  for (let i=0; i<20; i++) {
    otReqs.push({ id:uid('d9',i+1), tenant_id:T, employee_id:activeEmps[i%10], date:d(2026,rng(1,3),rng(1,28)),
      start_time:'17:00', end_time:`${19+rng(0,3)}:00`, hours:rng(2,6),
      reason:['Urgencia quirurgica','Inventario mensual','Cierre contable','Recepcion mercancia','Atencion emergencia','Campana vacunacion','Evento especial'][i%7],
      status:i<8?'APPROVED':i<15?'PENDING':'REJECTED', reviewed_by:i<8?A:null, reviewed_at:i<8?d(2026,2,rng(1,28)):null });
  }
  await ins('overtime_requests', otReqs);

  // Absence requests
  const absTypes = ['VACATION','SICK_LEAVE','PERSONAL','UNPAID','MATERNITY','PATERNITY'];
  const absReqs = [];
  for (let i=0; i<15; i++) {
    const days = rng(1,10);
    const mo = rng(1,3);
    const startDay = rng(1,15);
    const endDay = Math.min(startDay+days, 28);
    absReqs.push({ id:uid('e0',i+1), tenant_id:T, employee_id:activeEmps[i%10],
      absence_type:absTypes[i%6], start_date:d(2026,mo,startDay), end_date:d(2026,mo,endDay),
      days, reason:['Vacaciones programadas','Incapacidad medica','Diligencia personal','Licencia no remunerada','Licencia maternidad','Licencia paternidad'][i%6],
      status:i<7?'APPROVED':i<12?'PENDING':'REJECTED', reviewed_by:i<7?A:null });
  }
  await ins('absence_requests', absReqs);

  // Payroll periods + loans + benefits
  await ins('payroll_periods', [
    { id:uid('dc',1), tenant_id:T, name:'Nomina Enero 2026', start_date:'2026-01-01', end_date:'2026-01-31', status:'CLOSED' },
    { id:uid('dc',2), tenant_id:T, name:'Nomina Febrero 2026', start_date:'2026-02-01', end_date:'2026-02-28', status:'CLOSED' },
    { id:uid('dc',3), tenant_id:T, name:'Nomina Marzo 2026', start_date:'2026-03-01', end_date:'2026-03-31', status:'OPEN' },
  ]);
  await ins('payroll_loans', [
    { id:uid('dd',1), tenant_id:T, employee_id:empIds[0], amount_total:3000000, amount_paid:1500000, installment_count:6, installments_paid:3, installment_amount:500000, interest_rate:0, start_date:'2025-12-01', description:'Prestamo libranza - urgencia medica', status:'ACTIVE' },
    { id:uid('dd',2), tenant_id:T, employee_id:empIds[3], amount_total:1500000, amount_paid:1000000, installment_count:3, installments_paid:2, installment_amount:500000, interest_rate:0, start_date:'2026-01-01', description:'Anticipo de vacaciones', status:'ACTIVE' },
    { id:uid('dd',3), tenant_id:T, employee_id:empIds[6], amount_total:2000000, amount_paid:0, installment_count:4, installments_paid:0, installment_amount:500000, interest_rate:0, start_date:'2026-03-01', description:'Prestamo calamidad domestica', status:'ACTIVE' },
  ]);
  await ins('payroll_benefits', [
    { id:uid('de',1), tenant_id:T, employee_id:empIds[0], name:'Auxilio Movilidad', amount:200000, is_taxable:false, is_salary:false, frequency:'MONTHLY', status:'ACTIVE' },
    { id:uid('de',2), tenant_id:T, employee_id:empIds[1], name:'Auxilio Movilidad', amount:200000, is_taxable:false, is_salary:false, frequency:'MONTHLY', status:'ACTIVE' },
    { id:uid('de',3), tenant_id:T, employee_id:empIds[5], name:'Bono Productividad', amount:800000, is_taxable:true, is_salary:false, frequency:'MONTHLY', status:'ACTIVE' },
    { id:uid('de',4), tenant_id:T, employee_id:empIds[4], name:'Auxilio Alimentacion', amount:100000, is_taxable:false, is_salary:false, frequency:'MONTHLY', status:'ACTIVE' },
    { id:uid('de',5), tenant_id:T, employee_id:empIds[9], name:'Auxilio Alimentacion', amount:100000, is_taxable:false, is_salary:false, frequency:'MONTHLY', status:'ACTIVE' },
    { id:uid('de',6), tenant_id:T, employee_id:empIds[10], name:'Bono Antiguedad', amount:300000, is_taxable:true, is_salary:false, frequency:'MONTHLY', status:'ACTIVE' },
    { id:uid('de',7), tenant_id:T, employee_id:empIds[2], name:'Auxilio Educacion', amount:250000, is_taxable:false, is_salary:false, frequency:'MONTHLY', status:'ACTIVE' },
  ]);

  // ═══ PHASE 15: Training ═══
  console.log('\n-- PHASE 15: Training --');
  const tpCats = ['SAFETY','TECHNICAL','QUALITY','MANAGEMENT','COMPLIANCE','INDUCTION'];
  const tpNames = [
    ['CAP-001','Bioseguridad Veterinaria','SAFETY',8,true],
    ['CAP-002','Manejo de Cadena de Frio','TECHNICAL',4,true],
    ['CAP-003','Atencion al Cliente en Clinicas','QUALITY',6,false],
    ['CAP-004','Liderazgo y Gestion de Equipos','MANAGEMENT',12,false],
    ['CAP-005','Normatividad ICA Productos Veterinarios','COMPLIANCE',8,true],
    ['CAP-006','Induccion Nuevos Empleados GVM','INDUCTION',16,true],
    ['CAP-007','Tecnicas de Ventas Productos Veterinarios','TECHNICAL',6,false],
    ['CAP-008','Primeros Auxilios Animales','SAFETY',4,true],
    ['CAP-009','Control de Calidad Medicamentos','QUALITY',8,true],
    ['CAP-010','Excel Avanzado para Reportes','TECHNICAL',4,false],
  ];
  const tpRows = tpNames.map((t,i) => ({
    id:uid('d6',i+1), tenant_id:T, code:t[0], name:t[1], category:t[2], duration_hours:t[3], is_mandatory:t[4], description:`Programa de capacitacion: ${t[1]}`
  }));
  await ins('training_programs', tpRows);

  const trRows = [];
  for (let i=0; i<30; i++) {
    const prog = tpRows[i % tpRows.length];
    const emp = empIds[i % empIds.length];
    const completed = i < 20;
    trRows.push({ id:uid('d7',i+1), tenant_id:T, employee_id:emp, program_id:prog.id,
      scheduled_date:d(2026,rng(1,3),rng(1,28)), completion_date:completed?d(2026,rng(1,3),rng(1,28)):null,
      score:completed?rng(60,100):null, status:completed?(rng(1,10)>2?'COMPLETED':'FAILED'):'SCHEDULED',
      certificate_number:completed?`CERT-${String(i+1).padStart(4,'0')}`:null });
  }
  await ins('training_records', trRows);

  // ═══ PHASE 16: Quality ═══
  console.log('\n-- PHASE 16: Quality --');
  const qiStages = ['INCOMING','IN_PROCESS','OUTGOING'];
  const qiResults = ['APPROVED','REJECTED','CONDITIONAL'];
  const qiRows = [];
  for (let i=0; i<20; i++) {
    const qtyInsp = rng(10,200);
    const result = qiResults[i%3===2?2:i%5===0?1:0];
    const rejected = result==='REJECTED'?qtyInsp:result==='CONDITIONAL'?rng(1,Math.floor(qtyInsp*0.1)):0;
    qiRows.push({ id:uid('cb',i+1), tenant_id:T, stage:qiStages[i%3], product_id:prodIds[i%goodProdsSub.length],
      lot_number:`LOT-${String(i+1).padStart(4,'0')}`, quantity_inspected:qtyInsp,
      quantity_approved:qtyInsp-rejected, quantity_rejected:rejected, result,
      inspector_id:A, inspection_date:d(2026,rng(1,3),rng(1,28)), notes:`Inspeccion #${i+1}` });
  }
  await ins('quality_inspections', qiRows);

  const ncrRows = [];
  for (let i=0; i<8; i++) {
    ncrRows.push({ id:uid('cc',i+1), tenant_id:T, inspection_id:qiRows[i*2+1]?.id||qiRows[i].id,
      ncr_number:`NCR-2026-${String(i+1).padStart(4,'0')}`,
      description:['Temperatura fuera de rango en transporte','Empaque danado','Etiquetado incorrecto','Contaminacion cruzada',
        'Lote vencido recibido','Color fuera de especificacion','Peso incorrecto','Documentacion incompleta'][i],
      severity:['LOW','MEDIUM','HIGH','CRITICAL'][i%4],
      root_cause:i<5?'Falla en proceso de proveedor':null,
      corrective_action:i<3?'Devolucion al proveedor y reemplazo':null,
      status:i<3?'CLOSED':i<6?'IN_PROGRESS':'OPEN', closed_at:i<3?d(2026,2,rng(15,28)):null });
  }
  await ins('quality_ncrs', ncrRows);

  // ═══ PHASE 17: Equipment + Maintenance ═══
  console.log('\n-- PHASE 17: Maintenance --');
  const eqNames = [
    ['EQ-001','Refrigerador Cadena de Frio 500L','Thermo Fisher','TSX505SA','SN-TF-2024-001','Bodega Frio'],
    ['EQ-002','Autoclave 20L Digital','Tuttnauer','2340EA','SN-TT-2023-001','Sala Cirugia'],
    ['EQ-003','Microscopio Binocular LED','Olympus','CX23','SN-OL-2024-002','Laboratorio'],
    ['EQ-004','Rayos X Digital Veterinario','MinXray','HF100+','SN-MX-2023-003','Sala Diagnostico'],
    ['EQ-005','Ecografo Portatil','SonoScape','S2V','SN-SS-2024-004','Sala Diagnostico'],
    ['EQ-006','Monitor Multiparametro','Mindray','iPM10','SN-MR-2023-005','Sala Cirugia'],
    ['EQ-007','Centrifuga Hematocrito','Hettich','EBA 200','SN-HT-2024-006','Laboratorio'],
    ['EQ-008','Maquina Anestesia Veterinaria','VetEquip','E-Z Anesthesia','SN-VE-2023-007','Sala Cirugia'],
    ['EQ-009','Balanza Precision 0.01g','Ohaus','EX224','SN-OH-2024-008','Farmacia'],
    ['EQ-010','Congelador -20C Vacunas','Vestfrost','MF314','SN-VF-2023-009','Bodega Frio'],
  ];
  const eqRows = eqNames.map((e,i) => ({
    id:uid('cd',i+1), tenant_id:T, code:e[0], name:e[1], brand:e[2], model:e[3],
    serial_number:e[4], location:e[5], status:'ACTIVE', purchase_date:d(2023+Math.floor(i/5),rng(1,12),rng(1,28)),
    last_maintenance_date:d(2026,1,rng(1,28)), next_maintenance_date:d(2026,4+Math.floor(i/3),rng(1,28))
  }));
  await ins('equipment', eqRows);

  const moTypes = ['PREVENTIVE','CORRECTIVE','PREDICTIVE'];
  const moStatuses = ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'];
  const moRows = [];
  for (let i=0; i<20; i++) {
    const completed = i < 10;
    moRows.push({ id:uid('ce',i+1), tenant_id:T, equipment_id:eqRows[i%10].id,
      order_type:moTypes[i%3], priority:['LOW','MEDIUM','HIGH','CRITICAL'][i%4],
      status:completed?'COMPLETED':moStatuses[i%4],
      description:['Calibracion programada','Cambio de filtros','Revision compresor','Limpieza optica',
        'Reemplazo sensor temperatura','Actualizacion software','Verificacion presion','Cambio aceite',
        'Inspeccion electrica','Limpieza general'][i%10],
      technician_name:['Ing. Pedro Alvarez','Tec. Maria Rojas','Ing. Carlos Diaz','Biomedico Juan Lopez'][i%4],
      scheduled_date:d(2026,rng(1,3),rng(1,28)), completed_date:completed?d(2026,rng(1,3),rng(15,28)):null,
      estimated_cost:rng(100000,2000000), actual_cost:completed?rng(80000,2500000):null, created_by:A });
  }
  await ins('maintenance_orders', moRows);

  // ═══ PHASE 18: Logistics ═══
  console.log('\n-- PHASE 18: Logistics --');
  const carrierNames = [
    ['Servientrega SA','8600001234','Centro Empresarial','018000519910','clientes@servientrega.com'],
    ['Coordinadora Mercantil SA','8600345672','Cotizaciones','(601) 7448888','cotizaciones@coordinadora.com'],
    ['TCC SAS','8600456783','Gestion Comercial','(601) 3822000','gestion@tcc.com.co'],
    ['DHL Express Colombia SAS','8900024376','Customer Service','(601) 4231000','cs.colombia@dhl.com'],
    ['Logistica Farma Cadena de Frio SAS','9001234588','Operaciones Farma','(601) 5541200','ops@farmafrio.com.co'],
  ];
  const carrierIds = carrierNames.map((_,i) => uid('ca',i+1));
  await ins('logistics_carriers', carrierNames.map((c,i) => ({
    id:carrierIds[i], tenant_id:T, name:c[0], nit:c[1], contact_name:c[2], phone:c[3], email:c[4], is_active:true
  })));

  // Shipments linked to invoice documents
  const invoiceDocs = docs.filter(d => d.doc_type === 'INVOICE').slice(0, 15);
  const shipRows = invoiceDocs.map((doc, i) => ({
    id:uid('cf',i+1), tenant_id:T, order_id:doc.id, carrier_id:carrierIds[i%5], warehouse_id:WH[i%3],
    tracking_number:`TRK-${String(1000+i+1)}`, status:i<5?'DELIVERED':i<10?'SHIPPED':'PENDING',
    shipped_at:i<10?`${d(2026,2,rng(1,20))}T10:00:00Z`:null,
    delivered_at:i<5?`${d(2026,2,rng(15,28))}T14:00:00Z`:null
  }));
  await ins('logistics_shipments', shipRows);

  const siRows = [];
  for (let i=0; i<15; i++) {
    const numItems = rng(2,4);
    for (let j=0; j<numItems; j++) {
      const qty = rng(5,30);
      siRows.push({ id:uid('c0',i*4+j+1), shipment_id:shipRows[i].id,
        product_id:prodIds[(i*4+j)%prodIds.length], qty_ordered:qty, qty_shipped:i<10?qty:0 });
    }
  }
  await ins('logistics_shipment_items', siRows);

  // ═══ PHASE 19: Fiscal Periods ═══
  console.log('\n-- PHASE 19: Fiscal Periods --');
  const fpRows = [];
  const fpItems = [];
  for (let mo=10; mo<=15; mo++) {
    const yr = mo <= 12 ? 2025 : 2026;
    const realMo = mo > 12 ? mo - 12 : mo;
    const period = `${yr}-${String(realMo).padStart(2,'0')}`;
    const id = uid('c1', mo-9);
    const closed = mo <= 14; // Oct-Feb closed, Mar open
    fpRows.push({ id, tenant_id:T, period, status:closed?'CLOSED':'OPEN',
      closed_by:closed?A:null, closed_at:closed?`${d(yr,realMo,28)}T23:59:00Z`:null });
    // Close items for closed periods
    if (closed) {
      const items = ['journal_review','bank_reconciliation','inventory_count','tax_declaration','payroll_close'];
      items.forEach((key, j) => {
        fpItems.push({ id:uid('c2',(mo-9)*5+j+1), tenant_id:T, period_id:id, item_key:key, is_confirmed:true, confirmed_by:A });
      });
    }
  }
  await ins('fiscal_periods', fpRows);
  await ins('period_close_items', fpItems);

  // ═══ PHASE 20: Budgets ═══
  console.log('\n-- PHASE 20: Budgets --');
  const budgetId = uid('c3', 1);
  await ins('budgets', { id:budgetId, tenant_id:T, name:'Presupuesto Anual 2026', description:'Proyecciones financieras 2026',
    year:2026, period_type:'ANNUAL', status:'APPROVED', total_income:480000000, total_expense:380000000, created_by:A });
  const blRows = [
    { tenant_id:T, budget_id:budgetId, category:'Ventas Productos', line_type:'INCOME', amount:320000000 },
    { tenant_id:T, budget_id:budgetId, category:'Servicios Veterinarios', line_type:'INCOME', amount:120000000 },
    { tenant_id:T, budget_id:budgetId, category:'Otros Ingresos', line_type:'INCOME', amount:40000000 },
    { tenant_id:T, budget_id:budgetId, category:'Costo de Ventas', line_type:'EXPENSE', amount:180000000 },
    { tenant_id:T, budget_id:budgetId, category:'Nomina y Prestaciones', line_type:'EXPENSE', amount:96000000 },
    { tenant_id:T, budget_id:budgetId, category:'Arrendamiento', line_type:'EXPENSE', amount:24000000 },
    { tenant_id:T, budget_id:budgetId, category:'Marketing y Publicidad', line_type:'EXPENSE', amount:18000000 },
    { tenant_id:T, budget_id:budgetId, category:'Servicios Publicos', line_type:'EXPENSE', amount:8000000 },
    { tenant_id:T, budget_id:budgetId, category:'Tecnologia', line_type:'EXPENSE', amount:12000000 },
    { tenant_id:T, budget_id:budgetId, category:'Impuestos y Aportes', line_type:'EXPENSE', amount:28000000 },
    { tenant_id:T, budget_id:budgetId, category:'Mantenimiento Equipos', line_type:'EXPENSE', amount:6000000 },
    { tenant_id:T, budget_id:budgetId, category:'Gastos Generales', line_type:'EXPENSE', amount:8000000 },
  ];
  await ins('budget_lines', blRows);

  // ═══ PHASE 21: Fixed Assets ═══
  console.log('\n-- PHASE 21: Fixed Assets --');
  const faRows = [
    { id:uid('c5',1), tenant_id:T, name:'Local Comercial Cll 72', code:'AF-001', category:'BUILDING', acquisition_date:'2020-01-15', acquisition_cost:350000000, salvage_value:50000000, useful_life_years:20, accumulated_depreciation:90000000, status:'ACTIVE', location:'Sede Principal' },
    { id:uid('c5',2), tenant_id:T, name:'Vehiculo Chevrolet NHR Refrigerado', code:'AF-002', category:'VEHICLE', acquisition_date:'2022-06-01', acquisition_cost:95000000, salvage_value:15000000, useful_life_years:10, accumulated_depreciation:28000000, status:'ACTIVE', location:'Parqueadero' },
    { id:uid('c5',3), tenant_id:T, name:'Equipo Rayos X MinXray HF100+', code:'AF-003', category:'EQUIPMENT', acquisition_date:'2023-03-15', acquisition_cost:48000000, salvage_value:5000000, useful_life_years:10, accumulated_depreciation:12900000, status:'ACTIVE', location:'Sala Diagnostico' },
    { id:uid('c5',4), tenant_id:T, name:'Autoclave Tuttnauer 2340EA', code:'AF-004', category:'EQUIPMENT', acquisition_date:'2023-01-10', acquisition_cost:18000000, salvage_value:2000000, useful_life_years:10, accumulated_depreciation:4800000, status:'ACTIVE', location:'Sala Cirugia' },
    { id:uid('c5',5), tenant_id:T, name:'Servidor Dell PowerEdge T550', code:'AF-005', category:'COMPUTER', acquisition_date:'2024-02-01', acquisition_cost:12000000, salvage_value:1000000, useful_life_years:5, accumulated_depreciation:4400000, status:'ACTIVE', location:'Cuarto Sistemas' },
    { id:uid('c5',6), tenant_id:T, name:'Muebles Recepcion y Sala Espera', code:'AF-006', category:'FURNITURE', acquisition_date:'2020-01-15', acquisition_cost:8000000, salvage_value:500000, useful_life_years:10, accumulated_depreciation:4500000, status:'ACTIVE', location:'Recepcion' },
    { id:uid('c5',7), tenant_id:T, name:'Ecografo SonoScape S2V', code:'AF-007', category:'EQUIPMENT', acquisition_date:'2024-06-01', acquisition_cost:35000000, salvage_value:3000000, useful_life_years:10, accumulated_depreciation:5600000, status:'ACTIVE', location:'Sala Diagnostico' },
    { id:uid('c5',8), tenant_id:T, name:'Refrigerador Cadena de Frio 500L', code:'AF-008', category:'EQUIPMENT', acquisition_date:'2024-01-15', acquisition_cost:15000000, salvage_value:1500000, useful_life_years:10, accumulated_depreciation:2700000, status:'ACTIVE', location:'Bodega Frio' },
    { id:uid('c5',9), tenant_id:T, name:'Sistema CCTV 8 Camaras', code:'AF-009', category:'COMPUTER', acquisition_date:'2023-09-01', acquisition_cost:5500000, salvage_value:500000, useful_life_years:5, accumulated_depreciation:2750000, status:'ACTIVE', location:'General' },
    { id:uid('c5',10), tenant_id:T, name:'Motocicleta Domicilios AKT TT125', code:'AF-010', category:'VEHICLE', acquisition_date:'2025-01-15', acquisition_cost:8500000, salvage_value:1500000, useful_life_years:5, accumulated_depreciation:1400000, status:'ACTIVE', location:'Parqueadero' },
  ];
  await ins('fixed_assets', faRows);

  // ═══ PHASE 22: Contracts ═══
  console.log('\n-- PHASE 22: Contracts --');
  const ctRows = [
    { id:uid('c6',1), tenant_id:T, title:'Arrendamiento Local Cll 72', contract_number:'CTR-001', contract_type:'LEASE', status:'ACTIVE', party_id:custIds[0], start_date:'2024-01-01', end_date:'2026-12-31', auto_renew:true, value:66600000, currency:'COP', description:'Arriendo mensual $1.850.000 + IVA' },
    { id:uid('c6',2), tenant_id:T, title:'Servicio Tecnico Equipos Biomedicos', contract_number:'CTR-002', contract_type:'SERVICE', status:'ACTIVE', party_id:vendorIds[6], start_date:'2025-01-01', end_date:'2025-12-31', auto_renew:true, value:24000000, currency:'COP', description:'Mantenimiento preventivo trimestral equipos biomedicos' },
    { id:uid('c6',3), tenant_id:T, title:'Convenio Granja Avicola San Juan', contract_number:'CTR-003', contract_type:'SERVICE', status:'ACTIVE', party_id:custIds[1], start_date:'2025-06-01', end_date:'2026-05-31', auto_renew:false, value:48000000, currency:'COP', description:'Plan sanitario integral avicola' },
    { id:uid('c6',4), tenant_id:T, title:'Suministro Royal Canin 2026', contract_number:'CTR-004', contract_type:'PURCHASE', status:'ACTIVE', party_id:vendorIds[2], start_date:'2026-01-01', end_date:'2026-12-31', auto_renew:true, value:120000000, currency:'COP', description:'Contrato marco de suministro alimento mascotas' },
    { id:uid('c6',5), tenant_id:T, title:'Consultoria Tributaria DIAN', contract_number:'CTR-005', contract_type:'CONSULTING', status:'ACTIVE', party_id:vendorIds[9], start_date:'2026-01-01', end_date:'2026-12-31', auto_renew:false, value:18000000, currency:'COP', description:'Asesoria facturacion electronica y tributaria' },
    { id:uid('c6',6), tenant_id:T, title:'Poliza Todo Riesgo Sede', contract_number:'CTR-006', contract_type:'OTHER', status:'ACTIVE', start_date:'2025-07-01', end_date:'2026-06-30', auto_renew:false, value:8500000, currency:'COP', description:'Seguro integral sede principal' },
    { id:uid('c6',7), tenant_id:T, title:'Esterilizacion Masiva Chia', contract_number:'CTR-007', contract_type:'SERVICE', status:'DRAFT', party_id:custIds[8], start_date:'2026-04-01', end_date:'2026-09-30', auto_renew:false, value:45000000, currency:'COP', description:'300 esterilizaciones caninos municipio Chia' },
    { id:uid('c6',8), tenant_id:T, title:'Transporte Refrigerado Farma', contract_number:'CTR-008', contract_type:'SERVICE', status:'ACTIVE', start_date:'2025-01-01', end_date:'2026-06-30', auto_renew:true, value:36000000, currency:'COP', description:'Servicio logistica cadena de frio' },
    { id:uid('c6',9), tenant_id:T, title:'Software ERP GVM Corp', contract_number:'CTR-009', contract_type:'OTHER', status:'ACTIVE', start_date:'2025-01-01', end_date:'2026-12-31', auto_renew:false, value:12000000, currency:'COP', description:'Licencia anual y soporte ERP' },
    { id:uid('c6',10), tenant_id:T, title:'Contrato Trabajo Dr. Miguel Garcia', contract_number:'CTR-010', contract_type:'EMPLOYMENT', status:'EXPIRED', party_id:empPartyIds[5], start_date:'2025-06-01', end_date:'2026-05-31', auto_renew:false, value:72000000, currency:'COP', description:'Prestacion servicios veterinario especialista' },
  ];
  await ins('contracts', ctRows);

  // ═══ PHASE 23: Support Tickets ═══
  console.log('\n-- PHASE 23: Support Tickets --');
  const tkRows = [];
  const tkSubjects = [
    ['Error precio Ringer Lactato en FV','BILLING','HIGH'],['RMA Vacunas quiebre cadena frio','RMA','CRITICAL'],
    ['Disponibilidad Hills k/d','LOGISTICS','LOW'],['FV vencida plan de pago','BILLING','MEDIUM'],
    ['Producto equivocado en pedido','LOGISTICS','HIGH'],['Solicitud certificado retencion','BILLING','LOW'],
    ['Demora entrega pedido 3 dias','LOGISTICS','MEDIUM'],['Falla en refrigerador vacunas','TECHNICAL','CRITICAL'],
    ['Actualizacion datos fiscales NIT','BILLING','LOW'],['Reclamo calidad alimento lote BCH','RMA','HIGH'],
    ['Factura duplicada FV-2026-0045','BILLING','MEDIUM'],['Solicitud copia factura electronica','OTHER','LOW'],
    ['Error en peso producto recibido','RMA','MEDIUM'],['Consulta horario atencion sede','OTHER','LOW'],
    ['Fuga refrigerante equipo cadena frio','TECHNICAL','HIGH'],['Solicitud cotizacion mayorista','OTHER','MEDIUM'],
    ['Devolucion producto vencido','RMA','HIGH'],['Problema acceso portal cliente','TECHNICAL','MEDIUM'],
    ['Consulta estado pedido OV-2026','LOGISTICS','LOW'],['Reclamacion garantia termometro','RMA','MEDIUM'],
  ];
  const tkStatuses = ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'];
  for (let i=0; i<20; i++) {
    const [subj,cat,prio] = tkSubjects[i];
    tkRows.push({ id:uid('fc',i+1), tenant_id:T, party_id:custIds[i%custIds.length], number:`TK-2026-${String(i+1).padStart(4,'0')}`,
      subject:subj, description:`Detalle del ticket: ${subj}`, category:cat, priority:prio,
      status:tkStatuses[i%4], assigned_to:A, sla_deadline:new Date(Date.now()+(i+1)*86400000).toISOString() });
  }
  await ins('support_tickets', tkRows);

  // ═══ PHASE 24: DIAN ═══
  console.log('\n-- PHASE 24: DIAN --');
  // dian_config and dian_resolutions may have PostgREST schema cache issues, use rpc fallback
  try {
    await ins('dian_config', { tenant_id:T, software_id:'SW-GVM-001', pin:'12345',
      technical_key:'fc8eac422eba16e22ffd8c6f94b3f40a6e38571c', test_set_id:'TST-001', environment:'TEST' });
  } catch(e) { console.error('  dian_config fallback needed:', e.message); }

  try {
    await ins('dian_resolutions', [
      { tenant_id:T, prefix:'FV', resolution_number:'18764000001234', resolution_date:'2025-01-15', valid_from:'2025-01-15', valid_until:'2026-12-31', from_number:1, to_number:5000, current_number:81, doc_type:'INVOICE', status:'ACTIVE', start_range:1, end_range:5000, start_date:'2025-01-15', end_date:'2026-12-31' },
      { tenant_id:T, prefix:'NC', resolution_number:'18764000001235', resolution_date:'2025-01-15', valid_from:'2025-01-15', valid_until:'2026-12-31', from_number:1, to_number:1000, current_number:11, doc_type:'CREDIT_NOTE', status:'ACTIVE', start_range:1, end_range:1000, start_date:'2025-01-15', end_date:'2026-12-31' },
      { tenant_id:T, prefix:'ND', resolution_number:'18764000001236', resolution_date:'2025-01-15', valid_from:'2025-01-15', valid_until:'2026-12-31', from_number:1, to_number:500, current_number:1, doc_type:'DEBIT_NOTE', status:'ACTIVE', start_range:1, end_range:500, start_date:'2025-01-15', end_date:'2026-12-31' },
    ]);
  } catch(e) { console.error('  dian_resolutions fallback needed:', e.message); }

  // Electronic documents for first 20 invoices
  const eDocs = docs.filter(dd => dd.doc_type==='INVOICE').slice(0,20).map((doc,i) => ({
    id:uid('c9',i+1), tenant_id:T, document_id:doc.id, environment:'TEST',
    cufe:`cufe${String(i+1).padStart(40,'0')}`, qr_data:`https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=cufe${String(i+1).padStart(40,'0')}`,
    dian_status:i<15?'ACCEPTED':i<18?'PENDING':'REJECTED', sent_at:d(2026,2,rng(1,28))+'T10:00:00Z'
  }));
  await ins('electronic_documents', eDocs);

  // ═══ PHASE 25: Recurring + Payment Links ═══
  console.log('\n-- PHASE 25: Recurring + Payment Links --');
  const riRows = [
    { id:uid('d1',1), tenant_id:T, name:'Arriendo Mensual', party_id:custIds[0], frequency:'MONTHLY', next_run_date:'2026-04-01', last_run_date:'2026-03-01', status:'ACTIVE', lines:'[{"description":"Canon arrendamiento","qty":1,"unit_price":1850000}]', currency:'COP' },
    { id:uid('d1',2), tenant_id:T, name:'Servicio Tecnico Trimestral', party_id:vendorIds[6], frequency:'QUARTERLY', next_run_date:'2026-04-01', last_run_date:'2026-01-01', status:'ACTIVE', lines:'[{"description":"Mantenimiento preventivo equipos","qty":1,"unit_price":6000000}]', currency:'COP' },
    { id:uid('d1',3), tenant_id:T, name:'Facturacion Plan Avicola', party_id:custIds[1], frequency:'MONTHLY', next_run_date:'2026-04-01', last_run_date:'2026-03-01', status:'ACTIVE', lines:'[{"description":"Plan sanitario avicola mensual","qty":1,"unit_price":4000000}]', currency:'COP' },
    { id:uid('d1',4), tenant_id:T, name:'Suministro Alimento Royal Canin', party_id:vendorIds[2], frequency:'MONTHLY', next_run_date:'2026-04-01', last_run_date:'2026-03-01', status:'ACTIVE', lines:'[{"description":"Pedido mensual alimento","qty":1,"unit_price":10000000}]', currency:'COP' },
    { id:uid('d1',5), tenant_id:T, name:'Poliza Seguro Anual', frequency:'ANNUALLY', next_run_date:'2026-07-01', last_run_date:'2025-07-01', status:'ACTIVE', lines:'[{"description":"Prima anual seguro todo riesgo","qty":1,"unit_price":8500000}]', currency:'COP' },
  ];
  await ins('recurring_invoices', riRows);

  const plDocs = docs.filter(dd => dd.doc_type==='INVOICE' && dd.status==='SENT').slice(0,8);
  const plRows = plDocs.map((doc,i) => ({
    id:uid('d2',i+1), tenant_id:T, document_id:doc.id, token:`pay_${doc.id.slice(0,8)}_${Date.now().toString(36)}${i}`,
    amount:doc.total, currency:'COP', status:i<2?'PAID':i<5?'PENDING':'EXPIRED',
    payment_method:i<2?'PSE':null, payer_name:i<2?'Cliente Pagador':null,
    paid_at:i<2?`${d(2026,2,rng(15,28))}T10:00:00Z`:null,
    expires_at:new Date(Date.now()+(i<5?72:0)*3600000).toISOString()
  }));
  await ins('payment_links', plRows);

  // ═══ PHASE 26: Bank Statements ═══
  console.log('\n-- PHASE 26: Bank Statements --');
  const bsRows = [];
  const bslRows = [];
  // 6 statements: Oct-Mar for Bancolombia
  for (let mo=10; mo<=15; mo++) {
    const yr = mo<=12?2025:2026; const realMo = mo>12?mo-12:mo;
    const bsId = uid('d3', mo-9);
    bsRows.push({ id:bsId, tenant_id:T, account_id:tAccts[0].id,
      start_date:d(yr,realMo,1), end_date:d(yr,realMo,28),
      opening_balance:50000000+rng(-5000000,10000000), closing_balance:50000000+rng(-5000000,15000000),
      status:mo<=14?'COMPLETED':'DRAFT', created_by:A });
    // 6-8 lines per statement
    for (let j=0; j<rng(6,8); j++) {
      const isCredit = j%3!==0;
      bslRows.push({ id:uid('d4',(mo-9)*8+j+1), statement_id:bsId, tenant_id:T,
        date:d(yr,realMo,rng(1,28)), description:isCredit?`Consignacion cliente ${j+1}`:`Pago proveedor ${j+1}`,
        amount:rng(500000,8000000)*(isCredit?1:-1), status:mo<=13?'MATCHED':'UNMATCHED' });
    }
  }
  await ins('bank_statements', bsRows);
  await ins('bank_statement_lines', bslRows);

  // ═══ PHASE 27: Notifications ═══
  console.log('\n-- PHASE 27: Notifications --');
  const notifRows = [];
  const notifTemplates = [
    ['Nueva factura emitida','Se ha generado la factura FV-2026-{n}','SALES','/sales/invoices'],
    ['Pago recibido','Se registro un pago por ${amt} COP','ACCOUNTING','/treasury'],
    ['Stock bajo','El producto {prod} esta por debajo del minimo','INVENTORY','/inventory'],
    ['Ticket de soporte','Nuevo ticket TK-2026-{n} requiere atencion','CRM','/support'],
    ['Orden de compra aprobada','La OC #{n} fue aprobada exitosamente','PURCHASING','/purchasing'],
    ['Mantenimiento programado','Equipo {eq} tiene mantenimiento pendiente','MAINTENANCE','/maintenance'],
    ['Vacunacion vencida','Lote LOT-{n} proximo a vencer','QUALITY','/quality'],
    ['Nomina procesada','Nomina de {month} procesada correctamente','PAYROLL','/payroll'],
    ['Contrato por vencer','El contrato CTR-{n} vence en 30 dias','GENERAL','/contracts'],
    ['Meta de ventas alcanzada','Se alcanzo el 100% de la meta mensual','SALES','/analytics/sales'],
  ];
  for (let i=0; i<50; i++) {
    const tmpl = notifTemplates[i%10];
    notifRows.push({ tenant_id:T, user_id:A, title:tmpl[0], body:tmpl[1].replace('{n}',String(i+1)).replace('{amt}',String(rng(100,9000)*1000)).replace('{prod}','Producto '+(i+1)).replace('{eq}','EQ-00'+(i%10+1)).replace('{month}','Febrero 2026'),
      link:tmpl[3], category:tmpl[2], priority:i%5===0?'HIGH':'MEDIUM', is_read:i<30 });
  }
  await ins('app_notifications', notifRows);

  // ═══ DONE ═══
  console.log(`\n================================`);
  console.log(`SEED COMPLETO: ${total} filas insertadas`);
  console.log('================================\n');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
