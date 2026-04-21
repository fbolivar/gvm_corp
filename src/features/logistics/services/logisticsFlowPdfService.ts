import jsPDF from 'jspdf';

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
    primary: [15, 23, 42] as [number, number, number],    // Slate 900
    accent: [79, 70, 229] as [number, number, number],    // Indigo 600
    dark: [30, 41, 59] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    light: [241, 245, 249] as [number, number, number],
    border: [203, 213, 225] as [number, number, number],
    emerald: [16, 185, 129] as [number, number, number],
    sky: [14, 165, 233] as [number, number, number],
    amber: [245, 158, 11] as [number, number, number],
    purple: [147, 51, 234] as [number, number, number],
    teal: [20, 184, 166] as [number, number, number],
    rose: [225, 29, 72] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
};

const MARGIN = 16;
const PW = 210; // A4 width mm
const PH = 297; // A4 height mm

export const logisticsFlowPdfService = {
    generate(): void {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        let y = 0;

        // ─── PAGE 1: COVER ─────────────────────────────────────────────────
        // Header band
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, PW, 80, 'F');

        // Side accent
        doc.setFillColor(...COLORS.accent);
        doc.rect(0, 0, 4, PH, 'F');

        // Title
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.text('Flujo de Logística', MARGIN, 36);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 180, 200);
        doc.text('De la Orden de Venta al Despacho al Cliente', MARGIN, 46);

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('GVM Corporation Global Veterinary Medicine S.A.S.', MARGIN, 62);
        doc.text('Guía operativa — Sistema ERP', MARGIN, 68);
        doc.text(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), MARGIN, 74);

        y = 100;

        // Intro
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('¿Qué hace este documento?', MARGIN, y);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.dark);
        const intro = [
            'Explica paso a paso cómo una Orden de Venta creada por un comercial llega al módulo',
            'de Logística, cómo se transforma en un Despacho (shipment) y cómo cambiar los',
            'estados hasta que la mercancía se entregue al cliente.',
            '',
            'Audiencia: equipo comercial, equipo de logística, coordinadores.',
        ];
        intro.forEach(line => {
            doc.text(line, MARGIN, y);
            y += 5.5;
        });

        y += 4;

        // Actors table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.primary);
        doc.text('Actores del flujo', MARGIN, y);
        y += 8;

        const actors = [
            { role: 'Comercial', action: 'Crea la orden de venta en el módulo Ventas.' },
            { role: 'Logística', action: 'Recibe la orden, alista, empaca y despacha la mercancía.' },
            { role: 'Transportadora', action: 'Lleva el producto al cliente (interna o externa).' },
            { role: 'Sistema', action: 'Descuenta automáticamente inventario al despachar.' },
        ];
        actors.forEach(a => {
            doc.setFillColor(...COLORS.light);
            doc.rect(MARGIN, y - 3, PW - 2 * MARGIN, 7, 'F');
            doc.setTextColor(...COLORS.accent);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(a.role.toUpperCase(), MARGIN + 2, y + 1.5);
            doc.setTextColor(...COLORS.dark);
            doc.setFont('helvetica', 'normal');
            doc.text(a.action, MARGIN + 34, y + 1.5);
            y += 9;
        });

        y += 8;

        // Status flow diagram preview
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.primary);
        doc.text('Estados del despacho', MARGIN, y);
        y += 8;

        const states = [
            { label: 'Recibido', color: COLORS.amber },
            { label: 'En Alistamiento', color: COLORS.sky },
            { label: 'Listo Despacho', color: COLORS.accent },
            { label: 'Despachado', color: COLORS.purple },
            { label: 'En Tránsito', color: COLORS.teal },
            { label: 'Entregado', color: COLORS.emerald },
        ];
        let sx = MARGIN;
        const sw = (PW - 2 * MARGIN - 5 * 3) / states.length;
        states.forEach((s, i) => {
            doc.setFillColor(...s.color);
            doc.roundedRect(sx, y, sw, 10, 2, 2, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(s.label.toUpperCase(), sx + sw / 2, y + 6, { align: 'center' });
            sx += sw;
            if (i < states.length - 1) {
                doc.setDrawColor(...COLORS.border);
                doc.line(sx - 1, y + 5, sx + 2, y + 5);
                sx += 3;
            }
        });

        y += 20;
        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('El inventario se descuenta automáticamente cuando un despacho pasa a estado DESPACHADO.', MARGIN, y);

        // ─── PAGE 2: STEP 1 — COMERCIAL CREA PEDIDO ────────────────────────
        doc.addPage();
        drawStepHeader(doc, 1, 'El comercial crea la orden de venta', COLORS.sky);
        y = 50;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.dark);
        const step1Lines = [
            'El comercial ingresa al sistema y crea el pedido desde el módulo de Ventas.',
            '',
            'Ruta en el sistema:',
        ];
        step1Lines.forEach(l => { doc.text(l, MARGIN, y); y += 5.5; });

        // Ruta box
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(MARGIN, y, PW - 2 * MARGIN, 10, 1.5, 1.5, 'F');
        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.white);
        doc.text('Inicio → Ventas → Órdenes → Nuevo Pedido', MARGIN + 3, y + 6.5);
        y += 15;

        // Paso a paso
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary);
        doc.text('Pasos:', MARGIN, y);
        y += 7;

        const step1Substeps = [
            ['1.1', 'Click en "Nuevo Pedido" en la parte superior derecha.'],
            ['1.2', 'Seleccionar el cliente (campo "Cliente").'],
            ['1.3', 'Agregar líneas de productos (botón "Agregar producto").'],
            ['1.4', 'Diligenciar la receta médica y seleccionar el comercial responsable (cumplimiento ICA).'],
            ['1.5', 'Click en "Guardar Pedido". El sistema asigna un número consecutivo (OV-XXXX).'],
            ['1.6', 'Al enviarlo a Logística, el pedido queda con estado "SENT" y aparece en el módulo de Logística → Pendientes.'],
        ];
        step1Substeps.forEach(([n, txt]) => {
            doc.setFillColor(...COLORS.light);
            doc.circle(MARGIN + 3, y - 0.8, 3, 'F');
            doc.setTextColor(...COLORS.accent);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(n, MARGIN + 3, y + 0.5, { align: 'center' });
            doc.setTextColor(...COLORS.dark);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const splitTxt = doc.splitTextToSize(txt, PW - 2 * MARGIN - 12);
            doc.text(splitTxt, MARGIN + 10, y);
            y += splitTxt.length * 5.5 + 3;
        });

        y += 5;
        drawTip(doc, y, 'Por ahora los pedidos se generan aquí cuando WorldOffice no permite remisionar directamente. Cuando WO esté disponible, use WO para remisionar.');

        // ─── PAGE 3: STEP 2 — ORDEN APARECE EN PENDIENTES ──────────────────
        doc.addPage();
        drawStepHeader(doc, 2, 'La orden aparece como "Pendiente" en Logística', COLORS.amber);
        y = 50;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.dark);
        doc.text('Una vez creado el pedido, el equipo de logística lo ve en tiempo real.', MARGIN, y);
        y += 8;

        // Ruta box
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(MARGIN, y, PW - 2 * MARGIN, 10, 1.5, 1.5, 'F');
        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.white);
        doc.text('Inicio → Logística → tab "Pendientes"', MARGIN + 3, y + 6.5);
        y += 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary);
        doc.text('Qué verá el equipo de logística:', MARGIN, y);
        y += 7;

        const step2Items = [
            ['•', 'Listado de todas las órdenes de venta pendientes de despachar.'],
            ['•', 'Número de la orden, nombre del cliente, fecha, cantidad de productos.'],
            ['•', 'Botón "Alistar Despacho" a la derecha de cada orden.'],
            ['•', 'Buscador por número de orden o nombre de cliente.'],
        ];
        step2Items.forEach(([b, txt]) => {
            doc.setTextColor(...COLORS.accent);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(b, MARGIN + 2, y);
            doc.setTextColor(...COLORS.dark);
            doc.setFont('helvetica', 'normal');
            const splitTxt = doc.splitTextToSize(txt, PW - 2 * MARGIN - 8);
            doc.text(splitTxt, MARGIN + 6, y);
            y += splitTxt.length * 5.5 + 2;
        });

        y += 5;
        drawTip(doc, y, 'La pestaña "Resumen" muestra KPIs: cuántas órdenes están pendientes, en alistamiento, en tránsito y entregadas. Útil para el coordinador.');

        // ─── PAGE 4: STEP 3 — LOGÍSTICA CREA EL DESPACHO ───────────────────
        doc.addPage();
        drawStepHeader(doc, 3, 'Logística alista y crea el Despacho', COLORS.accent);
        y = 50;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.dark);
        doc.text('Al hacer click en "Alistar Despacho", el sistema abre un formulario para crear el shipment.', MARGIN, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary);
        doc.text('Datos a diligenciar en el formulario:', MARGIN, y);
        y += 7;

        const step3Items = [
            ['3.1', 'Bodega de salida: desde qué bodega sale la mercancía.'],
            ['3.2', 'Transportadora: transportadora externa o "Transporte Propio".'],
            ['3.3', 'Número de guía (opcional): guía de la transportadora si aplica.'],
            ['3.4', 'Alistado por, Verificado por, Despachado por: usuarios responsables.'],
            ['3.5', 'Costo de flete (opcional): valor pagado por transporte.'],
            ['3.6', 'Cantidad por producto: cuánto se despacha de cada línea.'],
            ['3.7', 'Click en "Crear Despacho". El shipment inicia en estado RECIBIDO.'],
        ];
        step3Items.forEach(([n, txt]) => {
            doc.setFillColor(...COLORS.light);
            doc.circle(MARGIN + 3, y - 0.8, 3, 'F');
            doc.setTextColor(...COLORS.accent);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(n, MARGIN + 3, y + 0.5, { align: 'center' });
            doc.setTextColor(...COLORS.dark);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const splitTxt = doc.splitTextToSize(txt, PW - 2 * MARGIN - 12);
            doc.text(splitTxt, MARGIN + 10, y);
            y += splitTxt.length * 5.5 + 3;
        });

        y += 5;
        drawTip(doc, y, 'Una vez creado, el despacho aparece en la pestaña "Despachos" con estado RECIBIDO. La orden original queda enlazada.');

        // ─── PAGE 5: STEP 4 — CAMBIOS DE ESTADO ────────────────────────────
        doc.addPage();
        drawStepHeader(doc, 4, 'Logística avanza los estados del despacho', COLORS.purple);
        y = 50;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.dark);
        doc.text('Cada estado representa una fase del proceso. Al hacer click en un despacho, se abre', MARGIN, y); y += 5.5;
        doc.text('el detalle con un botón para avanzar al siguiente estado.', MARGIN, y); y += 8;

        // Status transition table
        const transitions: Array<{from: string; to: string; button: string; effect: string; color: [number, number, number]}> = [
            { from: 'RECIBIDO', to: 'EN_ALISTAMIENTO', button: 'Iniciar Alistamiento', effect: 'Se comienza a preparar físicamente el pedido.', color: COLORS.sky },
            { from: 'EN_ALISTAMIENTO', to: 'LISTO_DESPACHO', button: 'Marcar Listo para Despacho', effect: 'Pedido empacado y listo para entregar al transportista.', color: COLORS.accent },
            { from: 'LISTO_DESPACHO', to: 'DESPACHADO', button: 'Registrar Despacho', effect: 'AUTOMÁTICO: el sistema descuenta inventario de la bodega.', color: COLORS.purple },
            { from: 'DESPACHADO', to: 'EN_TRANSITO', button: 'Marcar En Tránsito', effect: 'La transportadora tiene el pedido en movimiento.', color: COLORS.teal },
            { from: 'EN_TRANSITO', to: 'ENTREGADO', button: 'Confirmar Entrega', effect: 'Cliente recibió la mercancía. Se registra fecha de entrega.', color: COLORS.emerald },
        ];

        transitions.forEach(t => {
            if (y > 250) {
                doc.addPage();
                y = 30;
            }
            // Left status badge
            doc.setFillColor(...COLORS.light);
            doc.roundedRect(MARGIN, y, 48, 12, 1.5, 1.5, 'F');
            doc.setTextColor(...COLORS.dark);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(t.from, MARGIN + 24, y + 7.5, { align: 'center' });

            // Arrow
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(12);
            doc.text('>', MARGIN + 51, y + 8);

            // Right status badge
            doc.setFillColor(...t.color);
            doc.roundedRect(MARGIN + 56, y, 48, 12, 1.5, 1.5, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(t.to, MARGIN + 80, y + 7.5, { align: 'center' });

            // Button label
            doc.setTextColor(...COLORS.dark);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(`Botón: ${t.button}`, MARGIN + 108, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const fxLines = doc.splitTextToSize(t.effect, PW - MARGIN - 108 - MARGIN);
            doc.text(fxLines, MARGIN + 108, y + 9.5);

            y += Math.max(16, 12 + fxLines.length * 3);
        });

        y += 5;
        drawTip(doc, y, 'El estado DESPACHADO es crítico: desencadena el descuento automático de inventario. Solo marcar cuando el pedido fue entregado al transportista.');

        // ─── PAGE 6: DIAGRAMA COMPLETO + PREGUNTAS ─────────────────────────
        doc.addPage();
        drawStepHeader(doc, 5, 'Vista global y preguntas frecuentes', COLORS.emerald);
        y = 50;

        // Diagrama horizontal completo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary);
        doc.text('Diagrama del flujo completo', MARGIN, y);
        y += 10;

        const flowSteps = [
            { label: 'Comercial\ncrea pedido', color: COLORS.sky },
            { label: 'Pendiente\nen Logística', color: COLORS.amber },
            { label: 'Alistar\nDespacho', color: COLORS.accent },
            { label: 'Cambios\nde estado', color: COLORS.purple },
            { label: 'Entregado\nal cliente', color: COLORS.emerald },
        ];
        const fw = (PW - 2 * MARGIN - 4 * 6) / flowSteps.length;
        let fx = MARGIN;
        flowSteps.forEach((s, i) => {
            doc.setFillColor(...s.color);
            doc.roundedRect(fx, y, fw, 20, 2, 2, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            const lines = s.label.split('\n');
            lines.forEach((l, li) => {
                doc.text(l, fx + fw / 2, y + 9 + li * 4.5, { align: 'center' });
            });
            fx += fw;
            if (i < flowSteps.length - 1) {
                // Arrow
                doc.setDrawColor(...COLORS.muted);
                doc.setLineWidth(0.5);
                doc.line(fx + 1, y + 10, fx + 5, y + 10);
                doc.line(fx + 4, y + 8.5, fx + 5, y + 10);
                doc.line(fx + 4, y + 11.5, fx + 5, y + 10);
                fx += 6;
            }
        });

        y += 32;

        // FAQ
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.primary);
        doc.text('Preguntas frecuentes', MARGIN, y);
        y += 8;

        const faqs: Array<[string, string]> = [
            ['¿Cómo sabe el sistema que Logística recibió la orden?',
                'Al crear un Despacho desde la orden, el sistema automáticamente la toma. Antes de eso, aparece en "Pendientes".'],
            ['¿Dónde veo qué órdenes están en qué estado?',
                'En el tab "Resumen" del módulo Logística hay KPIs por estado. En "Despachos" hay una lista con badge de color por estado.'],
            ['¿Puedo retroceder un estado?',
                'No directamente. Si hay error en un estado, crear un despacho corregido o usar la opción de devolución (RETURNED).'],
            ['¿Qué pasa con el inventario al despachar?',
                'Al pasar a DESPACHADO, el sistema crea un movimiento de salida (OUT) en la bodega correspondiente y descuenta el stock.'],
            ['¿Puedo imprimir la guía de despacho?',
                'Sí. Desde el detalle del despacho hay un botón "Descargar PDF" con la guía formal.'],
            ['¿Y si uso WorldOffice directamente?',
                'WorldOffice sigue siendo la opción preferida para remisiones directas. Este flujo se usa cuando WO no lo permite.'],
        ];
        faqs.forEach(([q, a]) => {
            if (y > 265) {
                doc.addPage();
                y = 30;
            }
            doc.setFillColor(...COLORS.light);
            doc.rect(MARGIN, y - 2, PW - 2 * MARGIN, 6, 'F');
            doc.setTextColor(...COLORS.accent);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(q, MARGIN + 2, y + 2);
            y += 7;
            doc.setTextColor(...COLORS.dark);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const aLines = doc.splitTextToSize(a, PW - 2 * MARGIN - 4);
            doc.text(aLines, MARGIN + 2, y);
            y += aLines.length * 4.5 + 5;
        });

        // Footer: firmas
        if (y > 250) {
            doc.addPage();
            y = 30;
        }
        y += 10;
        doc.setDrawColor(...COLORS.border);
        doc.line(MARGIN, y, 80, y);
        doc.line(PW - 80, y, PW - MARGIN, y);
        y += 4;
        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Revisado por Logística', MARGIN, y);
        doc.text('Aprobado por Gerencia', PW - MARGIN, y, { align: 'right' });

        // Add page numbers on all pages
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setTextColor(...COLORS.muted);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${pageCount}`, PW - MARGIN, PH - 6, { align: 'right' });
            doc.text('GVM Corp — Flujo de Logística', MARGIN, PH - 6);
        }

        // Trigger download
        const fileName = `Flujo_Logistica_GVM_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawStepHeader(doc: jsPDF, stepNum: number, title: string, color: [number, number, number]) {
    // Side stripe
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, 4, PH, 'F');

    // Step band
    doc.setFillColor(...color);
    doc.rect(0, 0, PW, 36, 'F');

    // Step number circle
    doc.setFillColor(...COLORS.white);
    doc.circle(MARGIN + 6, 18, 8, 'F');
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(stepNum.toString(), MARGIN + 6, 22, { align: 'center' });

    // Title
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`PASO ${stepNum}`, MARGIN + 18, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, MARGIN + 18, 24);
}

function drawTip(doc: jsPDF, y: number, text: string) {
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(MARGIN, y, PW - 2 * MARGIN, 18, 2, 2, 'F');
    doc.setFillColor(...COLORS.amber);
    doc.rect(MARGIN, y, 2, 18, 'F');
    doc.setTextColor(...COLORS.amber);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Tip', MARGIN + 5, y + 5);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const txt = doc.splitTextToSize(text, PW - 2 * MARGIN - 10);
    doc.text(txt, MARGIN + 5, y + 11);
}
