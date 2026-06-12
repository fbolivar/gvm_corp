// Genera un PDF profesional con la guía paso a paso para el go-live de GVM Corp.
// Uso: node scripts/generate-golive-guide.mjs
import { jsPDF } from 'jspdf';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'Guia-GoLive-GVM-Corp-2026-04-20.pdf');

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Palette (RGB)
const C = {
    slate900: [15, 23, 42],
    slate700: [51, 65, 85],
    slate500: [100, 116, 139],
    slate300: [203, 213, 225],
    slate100: [241, 245, 249],
    slate50:  [248, 250, 252],
    emerald:  [16, 185, 129],
    sky:      [14, 165, 233],
    amber:    [245, 158, 11],
    rose:     [244, 63, 94],
};

let y = MARGIN;

function setColor(rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setFill(rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }

function pageBreakIfNeeded(required = 20) {
    if (y + required > 285) {
        doc.addPage();
        y = MARGIN;
    }
}

function h1(text) {
    pageBreakIfNeeded(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    setColor(C.slate900);
    doc.text(text, MARGIN, y);
    y += 3;
    setFill(C.slate900);
    doc.rect(MARGIN, y, 25, 1, 'F');
    y += 10;
}

function h2(text, tintRgb = C.slate900) {
    pageBreakIfNeeded(14);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(tintRgb);
    doc.text(text, MARGIN, y);
    y += 7;
}

function h3(text) {
    pageBreakIfNeeded(10);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(C.slate700);
    doc.text(text, MARGIN, y);
    y += 5;
}

function paragraph(text) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(C.slate700);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    lines.forEach(line => {
        pageBreakIfNeeded(6);
        doc.text(line, MARGIN, y);
        y += 4.8;
    });
    y += 2;
}

function bullets(items) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    items.forEach(item => {
        const lines = doc.splitTextToSize(item, CONTENT_W - 6);
        lines.forEach((line, idx) => {
            pageBreakIfNeeded(6);
            if (idx === 0) {
                setFill(C.slate500);
                doc.circle(MARGIN + 2, y - 1.2, 0.8, 'F');
            }
            setColor(C.slate700);
            doc.text(line, MARGIN + 6, y);
            y += 4.8;
        });
    });
    y += 2;
}

function step(num, title, description) {
    pageBreakIfNeeded(20);
    // Badge numbered
    setFill(C.slate900);
    doc.circle(MARGIN + 3, y - 0.5, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor([255, 255, 255]);
    doc.text(String(num), MARGIN + 3, y + 0.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(C.slate900);
    doc.text(title, MARGIN + 9, y);
    y += 5.5;

    if (description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        setColor(C.slate700);
        const lines = doc.splitTextToSize(description, CONTENT_W - 9);
        lines.forEach(line => {
            pageBreakIfNeeded(6);
            doc.text(line, MARGIN + 9, y);
            y += 4.8;
        });
    }
    y += 2;
}

function checkList(items) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    items.forEach(item => {
        pageBreakIfNeeded(7);
        // Checkbox
        doc.setDrawColor(C.slate300[0], C.slate300[1], C.slate300[2]);
        doc.setLineWidth(0.3);
        doc.rect(MARGIN + 2, y - 2.8, 3, 3);
        // Text
        setColor(C.slate700);
        const lines = doc.splitTextToSize(item, CONTENT_W - 9);
        lines.forEach((line, idx) => {
            if (idx > 0) pageBreakIfNeeded(6);
            doc.text(line, MARGIN + 8, y);
            y += 4.8;
        });
    });
    y += 2;
}

function calloutBox(title, text, tintRgb = C.amber) {
    const padding = 4;
    const textLines = doc.splitTextToSize(text, CONTENT_W - padding * 2);
    const boxH = 6 + 4.5 * textLines.length + padding * 2;
    pageBreakIfNeeded(boxH + 3);

    // Soft tint background
    setFill([tintRgb[0], tintRgb[1], tintRgb[2]]);
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.rect(MARGIN, y - 3, CONTENT_W, boxH, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));

    // Left border
    setFill(tintRgb);
    doc.rect(MARGIN, y - 3, 1.5, boxH, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(tintRgb);
    doc.text(title, MARGIN + padding + 1, y);
    y += 5;

    // Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setColor(C.slate700);
    textLines.forEach(line => {
        doc.text(line, MARGIN + padding + 1, y);
        y += 4.5;
    });
    y += padding + 1;
}

function moduleCard(label, route, checks) {
    const padding = 4;
    const headerH = 10;
    const lineH = 4.5;
    const totalH = headerH + padding * 2 + checks.length * lineH + 2;
    pageBreakIfNeeded(totalH + 4);

    // Outer rectangle
    doc.setDrawColor(C.slate300[0], C.slate300[1], C.slate300[2]);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y - 3, CONTENT_W, totalH, 'S');

    // Header strip
    setFill(C.slate50);
    doc.rect(MARGIN, y - 3, CONTENT_W, headerH, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(C.slate900);
    doc.text(label, MARGIN + padding, y + 2);

    // Route pill
    const routeWidth = doc.getTextWidth(route) + 6;
    setFill(C.slate900);
    doc.roundedRect(MARGIN + CONTENT_W - routeWidth - padding, y - 1, routeWidth, 5, 1, 1, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    setColor([255, 255, 255]);
    doc.text(route, MARGIN + CONTENT_W - routeWidth - padding + 3, y + 2.5);

    y += headerH + 2;

    // Checks
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setColor(C.slate700);
    checks.forEach(c => {
        doc.setDrawColor(C.slate300[0], C.slate300[1], C.slate300[2]);
        doc.rect(MARGIN + padding, y - 2.2, 2.5, 2.5);
        const lines = doc.splitTextToSize(c, CONTENT_W - padding * 2 - 6);
        lines.forEach((line, idx) => {
            doc.text(line, MARGIN + padding + 5, y);
            if (idx < lines.length - 1) y += 4;
        });
        y += lineH;
    });

    y += padding;
}

function footerOnAllPages() {
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(C.slate500);
        doc.text('GVM Corp ERP · Guía de verificación go-live · 2026-04-20', MARGIN, 292);
        doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, 292, { align: 'right' });
    }
}

// ==========================================================================
// CONTENIDO
// ==========================================================================

// ===== PORTADA =====
setFill(C.slate900);
doc.rect(0, 0, PAGE_W, 70, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(28);
setColor([255, 255, 255]);
doc.text('GVM Corp ERP', MARGIN, 30);

doc.setFont('helvetica', 'normal');
doc.setFontSize(14);
setColor([203, 213, 225]);
doc.text('Guía de verificación — Go-live', MARGIN, 42);

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
setColor(C.emerald);
doc.text('Lunes 20 de abril, 2026', MARGIN, 56);

y = 90;

doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
setColor(C.slate900);
doc.text('Objetivo', MARGIN, y);
y += 7;

doc.setFont('helvetica', 'normal');
doc.setFontSize(10.5);
setColor(C.slate700);
const objetivo = 'Este documento guía al equipo en la verificación de que los datos migrados desde WorldOffice están correctamente cargados en GVM Corp, y en las pruebas operativas del día 1 para detectar cualquier inconsistencia antes de entrar en operación normal.';
const objLines = doc.splitTextToSize(objetivo, CONTENT_W);
objLines.forEach(line => {
    doc.text(line, MARGIN, y);
    y += 5;
});
y += 8;

h2('Datos migrados desde WorldOffice');
bullets([
    'Terceros: 1.110 (1.018 clientes y 103 proveedores)',
    'Productos activos: 2.709',
    'Lotes: 550 (74 vigentes + 476 vencidos con fechas reales)',
    'Bodegas: 12',
    '1.219 registros con trazabilidad a WorldOffice (tabla party_external_ids)',
]);

calloutBox(
    'Pendiente de captura manual',
    'Las 3 órdenes de venta activas de abril 2026 en WorldOffice (PO2604-1694 Vetiplus, PO2604-1695 Campeon, PO2604-1696 American Vet — total $11.770.266) deben capturarse manualmente en GVM Corp el día 1. No se migraron automáticamente.',
    C.amber
);

calloutBox(
    'DIAN en modo operativo',
    'La integración real con DIAN se activa cuando se migre WorldOffice. Mientras tanto, las facturas tienen valor comercial y operativo, pero no generan CUFE real. El stock sí se descuenta FEFO correctamente.',
    C.sky
);

// ===== NUEVA PÁGINA: Preparación =====
doc.addPage();
y = MARGIN;

h1('1. Preparación inicial (10 min)');
paragraph('Antes de arrancar las pruebas, valida el acceso y ajustes básicos.');

step(1, 'Acceder a la aplicación',
    'Entra a https://gvm-corp.vercel.app (o el dominio configurado). Inicia sesión con tu usuario y contraseña.');

step(2, 'Verificar tu rol y permisos',
    'En el menú lateral, verifica que ves los módulos que te corresponden. El SUPER ADMIN ve todo; los roles operativos solo su ámbito.');

step(3, 'Revisar datos de la empresa',
    'Ve a Configuración → Empresa. Valida razón social, NIT, dirección, teléfono, email. Esta info aparece en todas las facturas.');

// ===== Verificación terceros =====
h1('2. Verificación de terceros (15 min)');
paragraph('Confirmar que los clientes y proveedores están correctamente migrados.');

moduleCard('Terceros', '/parties', [
    'Ver el total: debe mostrar 1.110 terceros',
    'Buscar un cliente conocido (ej: Vetiplus, American Vet) — debe aparecer',
    'Abrir un tercero y verificar: razón social, NIT, dirección, ciudad, departamento',
    'Verificar que el historial de auditoría al pie muestra el evento "Creado"',
    'Filtrar por rol: cliente vs proveedor — totales deben sumar 1.110',
]);

moduleCard('Proveedores', '/purchasing/vendors', [
    'Debe mostrar 103 proveedores',
    'Buscar uno conocido (ej: GENERICOS, LABORATORIO)',
    'Verificar que su NIT y datos de contacto son correctos',
]);

calloutBox(
    'Si falta algún tercero',
    'Reportar el número de documento del tercero faltante. En el peor caso, se puede crear manualmente desde /parties/new — llena razón social, NIT y tipo (cliente / proveedor).',
    C.amber
);

// ===== Verificación productos =====
h1('3. Verificación de productos (15 min)');

moduleCard('Productos', '/products', [
    'Ver el total: 2.709 productos activos',
    'Buscar por SKU y por nombre — ambos filtros deben funcionar',
    'Abrir un producto: verificar SKU, nombre, categoría IVA, precio de venta',
    'Revisar el stock actual (columna "Stock") — debe mostrar cantidad real',
    'Si hay productos con stock bajo, aparecen con alerta amber/rose',
]);

moduleCard('Catálogo (search comercial)', '/catalog', [
    'Buscar un producto y ver su disponibilidad',
    'Click en "Nueva cotización" debe redirigir con producto precargado',
]);

// ===== Verificación bodegas y lotes =====
h1('4. Bodegas, lotes y vencimientos (15 min)');

moduleCard('Bodegas', '/inventory/warehouses', [
    'Debe mostrar 12 bodegas activas',
    'Abrir una bodega — ver ubicaciones físicas (pasillo, estante, posición)',
    'Verificar que aparecen productos almacenados en ella',
]);

moduleCard('Lotes (control FEFO)', '/inventory/lots', [
    'Total: 550 lotes (74 vigentes + 476 vencidos)',
    'Verificar alertas de vencimiento: <30 días en amber, vencidos en rose',
    'Abrir un lote — verificar fecha de vencimiento, cantidad, producto asociado',
    'Los 476 lotes vencidos: decidir con Ana si se dan de baja o quedan visibles',
]);

moduleCard('Análisis ABC', '/inventory/analysis', [
    'Debe mostrar clasificación A (80%), B (95%), C (100%) por valor de ventas',
    'Distribución de Pareto visualizable',
]);

calloutBox(
    '¿Qué hacer con los 476 lotes vencidos?',
    'Son lotes con fecha de vencimiento ya pasada. Ana decide: (a) Darlos de baja masivamente si ya no existen físicamente; (b) Dejarlos visibles con alerta roja si aún hay existencia física. Un script de baja masiva se puede preparar si se decide opción (a).',
    C.amber
);

// ===== Captura de órdenes pendientes =====
h1('5. Captura manual de 3 órdenes 2026 (30 min)');
paragraph('Estas son las únicas órdenes de venta activas a la fecha del go-live. Deben capturarse en GVM Corp para no perder trazabilidad.');

h3('Orden 1: PO2604-1694 — VETIPLUS SAS');
paragraph('Valor sin IVA: $1.082.766. Ir a /sales/orders/new. Cliente: VETIPLUS SAS. Fecha: emisión original. Agregar las líneas de producto (SKU, cantidad, precio). Guardar como borrador.');

h3('Orden 2: PO2604-1695 — CAMPEON CENTRO VETERINARIO');
paragraph('Valor sin IVA: $9.888.000. Mismo proceso. Esta es la de mayor valor — doble chequeo de líneas, precios y bodega de despacho.');

h3('Orden 3: PO2604-1696 — AMERICAN VET');
paragraph('Valor sin IVA: $799.500. Proceso igual. Verificar total al final.');

calloutBox(
    'Total a verificar',
    'La suma de las 3 órdenes capturadas debe dar exactamente $11.770.266 (sin IVA). Si no cuadra, revisar la cantidad o precio unitario de las líneas.',
    C.emerald
);

// ===== Flujo end-to-end =====
h1('6. Prueba flujo comercial end-to-end (20 min)');
paragraph('Simular el ciclo completo: cotización → pedido → factura. Usar un cliente real pero producto de prueba (o uno de bajo consumo).');

step(1, 'Crear cotización',
    '/sales/quotations/new. Seleccionar cliente y 1-2 productos con bodega de despacho. Guardar.');

step(2, 'Convertir a pedido',
    'Abrir la cotización DRAFT → botón "Convertir a Pedido". Verificar que el pedido aparece vinculado (parent_id) en /documents.');

step(3, 'Convertir a factura',
    'Abrir el pedido DRAFT → botón "Facturar". Verificar redirect a /documents/[id] y que el documento aparece como factura DRAFT.');

step(4, 'Emitir la factura',
    'En la factura, click "Emitir DIAN". Confirmar. Verificar: status cambia a ACCEPTED, aparece número de factura, el stock del producto baja según FEFO (lote que vence primero se consume primero).');

step(5, 'Verificar audit trail',
    'Bajar a la sección "Historial de cambios" del documento. Debe haber al menos 3 eventos: Creado, Actualizado, Actualizado (al emitir).');

step(6, 'Verificar kardex / movimientos',
    'Ir a /inventory. Verificar que aparece un movimiento OUT con ref a la factura emitida, y que el lote consumido bajó su qty.');

// ===== Pruebas compras =====
h1('7. Prueba flujo de compras (15 min)');
paragraph('Verificar que las órdenes de compra y recepción funcionan correctamente.');

step(1, 'Crear una OC',
    '/purchasing/orders/new. Proveedor + líneas + guardar como borrador.');

step(2, 'Aprobar y recibir',
    'Abrir la OC DRAFT → enviar a aprobación → aprobar. Luego "Recibir" y marcar cantidades. El stock debe subir en la bodega destino.');

step(3, 'Verificar en inventario',
    'Ir a /inventory. Confirmar que aparece movimiento IN con ref a la OC recibida.');

// ===== Otros módulos =====
h1('8. Verificaciones adicionales (10 min)');

moduleCard('Dashboard', '/dashboard', [
    'Los KPIs muestran valores reales (no 0 ni valores ficticios)',
    'Aparecen las alertas de lotes por vencer si hay <30 días',
    'Los widgets de AR Aging y Top Productos cargan',
]);

moduleCard('Reportes contables', '/accounting/reports', [
    'Abrir P&L, Trial Balance, Balance Sheet — deben cargar sin error',
    'Exportar a Excel / Imprimir desde cualquier reporte funciona',
    'El header muestra NIT, dirección y fecha de generación',
]);

moduleCard('Documentos (centro documental)', '/documents', [
    'Debe listar todos los documentos creados',
    'Filtros por tipo (factura, cotización, etc.) funcionan',
    'Click en "Nuevo documento" abre el selector por tipo',
]);

// ===== Escenarios de error esperados =====
h1('9. Errores esperados y cómo reaccionar');

calloutBox(
    'Al emitir factura sin bodega',
    'Si una línea tiene producto pero no bodega, al guardar aparece mensaje rojo "Requerido para guardar". Seleccionar bodega y reintentar.',
    C.sky
);

calloutBox(
    'Al intentar borrar documento con hijos',
    'Si un documento tiene otros vinculados (ej: cotización con factura hija), aparece aviso. Elegir "Desvincular y eliminar" para forzar.',
    C.sky
);

calloutBox(
    'Stock insuficiente al emitir',
    'La RPC valida stock contra movimientos. Si no alcanza, arroja error "Stock insuficiente: disponible X, requerido Y". Verificar stock real o reducir cantidad.',
    C.sky
);

calloutBox(
    'Contraseña rechazada al cambiar',
    'Supabase detecta contraseñas filtradas. El mensaje en español indica "detectada en filtraciones públicas". Usar una passphrase (ej: perro-nube-rojo-luna!).',
    C.sky
);

// ===== Reportar problemas =====
h1('10. Reportar problemas detectados');
paragraph('Si durante las pruebas del día 1 detectas algo que no cuadra, reporta al equipo técnico con este formato:');

bullets([
    'Módulo: ej. Ventas → Facturas',
    'Qué estabas haciendo: ej. "Emitiendo factura INV-00023"',
    'Qué esperabas que pasara: ej. "Ver el total en el resumen"',
    'Qué pasó realmente: ej. "Apareció error: Stock insuficiente"',
    'Captura de pantalla del error (si aplica)',
]);

calloutBox(
    'Contacto técnico',
    'Email: fbolivarb@gmail.com · Respuesta en horas laborales. Para urgencias operativas del día 1, canalizar por el chat interno de la app (/collaboration).',
    C.emerald
);

// ===== Checklist resumen =====
doc.addPage();
y = MARGIN;
h1('Checklist resumen — marcar al completar');

h3('Preparación inicial');
checkList([
    'Acceso a la aplicación confirmado',
    'Rol y permisos verificados',
    'Datos de empresa revisados',
]);

h3('Verificación de datos migrados');
checkList([
    '1.110 terceros visibles en /parties',
    '2.709 productos visibles en /products',
    '550 lotes en /inventory/lots',
    '12 bodegas en /inventory/warehouses',
    'Productos tienen SKU, precio y stock correctos',
]);

h3('Captura manual');
checkList([
    'PO2604-1694 Vetiplus — capturada',
    'PO2604-1695 Campeon — capturada',
    'PO2604-1696 American Vet — capturada',
    'Suma de las 3 cuadra en $11.770.266',
]);

h3('Pruebas operativas');
checkList([
    'Flujo cotización → pedido → factura funciona',
    'Stock se descuenta FEFO al emitir factura',
    'Audit trail registra los cambios',
    'OC → recepción actualiza stock correctamente',
    'Reportes contables cargan sin error',
    'Dashboard muestra KPIs reales',
]);

h3('Decisiones operativas');
checkList([
    'Definido qué hacer con los 476 lotes vencidos',
    'Equipo entiende que DIAN queda mock hasta migrar WorldOffice',
    'Canal de reporte de errores acordado',
]);

calloutBox(
    'Cierre del día 1',
    'Si todo el checklist está marcado y las 3 órdenes están capturadas, el go-live es exitoso. Los próximos días son para estabilizar y afinar; cualquier hallazgo se corrige sobre la marcha sin afectar operación.',
    C.emerald
);

// ===== FOOTER =====
footerOnAllPages();

// Guardar
const pdfBuffer = doc.output('arraybuffer');
writeFileSync(OUT, Buffer.from(pdfBuffer));
console.log(`\n✅ PDF generado: ${OUT}`);
console.log(`   Tamaño: ${(Buffer.byteLength(Buffer.from(pdfBuffer)) / 1024).toFixed(1)} KB\n`);
