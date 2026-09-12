import jsPDF from 'jspdf';

const BLUE: [number, number, number] = [0, 150, 230];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const SOFT: [number, number, number] = [240, 248, 254];

const MARGIN = 16;

type Block =
    | { t: 'h1'; x: string }
    | { t: 'h2'; x: string }
    | { t: 'p'; x: string }
    | { t: 'ul'; items: string[] }
    | { t: 'note'; x: string };

interface ManualParams {
    companyName: string;
    logoDataUrl?: string | null;
    today?: string;
}

const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Contenido del manual ─────────────────────────────────────────────────────

const CONTENT: Block[] = [
    { t: 'h1', x: '1. Introducción' },
    { t: 'p', x: 'El módulo de Nómina de GVM Corp permite gestionar de forma integral a los colaboradores de la empresa: su contrato y remuneración, la asistencia, las novedades, la liquidación mensual, la seguridad social y la generación de certificados. Se complementa con el portal Mi Nómina, donde cada empleado consulta su propia información y descarga sus documentos.' },
    { t: 'p', x: 'Este manual está dividido en dos partes: la primera para el personal de Recursos Humanos / Administración (módulo Nómina), y la segunda para el colaborador (portal Mi Nómina).' },

    { t: 'h1', x: '2. Módulo NÓMINA (Recursos Humanos)' },
    { t: 'p', x: 'Se accede desde el menú lateral “Nómina”. Reúne todas las herramientas para administrar el personal.' },

    { t: 'h2', x: '2.1 Empleados' },
    { t: 'p', x: 'Es el maestro de colaboradores. Desde aquí se enrola (vincula) un nuevo empleado en tres pasos: (1) Información personal, (2) Contrato & Salario, (3) Método de pago.' },
    { t: 'ul', items: [
        'Contrato & Salario: tipo de contrato, fecha de ingreso, salario base, nivel de riesgo (ARL) y auxilio de transporte.',
        'Novedades de nómina (valores mensuales): comisiones de ventas, comisiones de recaudo, auxilios adicionales, auxilio de rodamiento, bonos salariales y bonos NO salariales.',
        'Al abrir un empleado se puede editar su información, ver su carnet con código QR y generar sus certificados laborales y de ingresos.',
        'Todo cambio queda registrado en el historial de auditoría del empleado (quién y cuándo).',
    ] },

    { t: 'h2', x: '2.2 Turnos y Puntualidad' },
    { t: 'ul', items: [
        'Turnos: define los horarios de trabajo y los asigna a los colaboradores.',
        'Puntualidad: reporte de llegadas tarde y cumplimiento de horario.',
    ] },

    { t: 'h2', x: '2.3 Control de Asistencia y Terminales QR' },
    { t: 'p', x: 'El registro de entrada y salida se realiza mediante el carnet con código QR del empleado y una Terminal QR (kiosco).' },
    { t: 'ul', items: [
        'Terminales QR: se crea una terminal (kiosco) por ubicación; genera un enlace/QR que se abre en una tablet o PC con cámara.',
        'El empleado escanea su carnet QR para marcar entrada o salida; el sistema detecta automáticamente la acción.',
        'Control de Asistencia: consolida las marcaciones diarias, horas trabajadas y novedades.',
    ] },

    { t: 'h2', x: '2.4 Horas Extra y Ausencias' },
    { t: 'ul', items: [
        'Horas Extra: registro y aprobación de horas extra (diurnas, nocturnas, festivas) que se suman a la liquidación.',
        'Ausencias: registro de incapacidades, permisos y vacaciones; el empleado también puede solicitarlas desde Mi Nómina.',
    ] },

    { t: 'h2', x: '2.5 Liquidación de Nómina y Consolidada' },
    { t: 'p', x: 'La Liquidación calcula el pago del período para cada colaborador a partir del salario, novedades, horas extra, ausencias y deducciones de ley (salud, pensión).' },
    { t: 'ul', items: [
        'Liquidación: procesa la nómina del período y genera los desprendibles.',
        'Consolidada: vista global de la nómina del período (totales por concepto y por empleado).',
        'Simulador: permite estimar el costo de un salario antes de contratar o modificar.',
    ] },

    { t: 'h2', x: '2.6 Seguridad Social y Dispersión' },
    { t: 'ul', items: [
        'Seguridad Social: cálculo de aportes (salud, pensión, ARL, parafiscales) para la planilla (PILA).',
        'Dispersión: preparación de los pagos de nómina a los colaboradores (efectivo o transferencia ACH según el método definido en cada empleado).',
        'Portal Financiero: gestión de préstamos y beneficios (libranzas, anticipos) que se descuentan en la nómina.',
    ] },

    { t: 'h2', x: '2.7 Liquidación definitiva (Terminación)' },
    { t: 'p', x: 'Calcula la liquidación final cuando un colaborador se retira: cesantías, intereses, prima, vacaciones e indemnización según corresponda.' },

    { t: 'h2', x: '2.8 Capacitación' },
    { t: 'p', x: 'Registro de programas de capacitación y de la participación de los colaboradores.' },

    { t: 'h2', x: '2.9 Certificados laborales y de ingresos' },
    { t: 'p', x: 'Desde la ficha de cada empleado, Recursos Humanos genera en PDF el Certificado Laboral y el Certificado de Ingresos con la identidad de la empresa (logo, NIT), la firma del responsable de RRHH y un código/QR de verificación (firma electrónica).' },
    { t: 'note', x: 'Configuración previa: en Configuración → Empresa cargue el logo y, en “Firmante de certificados laborales”, el nombre, cargo y firma del responsable de RRHH.' },

    { t: 'h1', x: '3. Portal MI NÓMINA (Colaborador)' },
    { t: 'p', x: 'Cada empleado con cuenta accede desde el menú “Mi Nómina”. Es su autoservicio para consultar y descargar su información.' },
    { t: 'ul', items: [
        'Marcar asistencia: registra su entrada y salida del día.',
        'Desprendibles de pago: consulta y descarga sus comprobantes de nómina.',
        'Horas extra: consulta sus horas extra registradas.',
        'Solicitar ausencias: pide permisos, vacaciones o reporta incapacidades.',
        'Certificados: descarga su Certificado Laboral y su Certificado de Ingresos en PDF, ya firmados y con código de verificación.',
    ] },

    { t: 'h1', x: '4. Recomendaciones y preguntas frecuentes' },
    { t: 'ul', items: [
        '¿No aparece el logo o la firma en el certificado? Configúrelos en Configuración → Empresa antes de generarlos.',
        '¿La cámara del kiosco no abre? Use el navegador con conexión segura (HTTPS) y permita el acceso a la cámara.',
        'Las horas se muestran en horario de Colombia (Bogotá, UTC-5).',
        'Todos los movimientos sensibles quedan auditados: puede revisarlos en Configuración → Auditoría.',
        'Ante cualquier duda, contacte al administrador del sistema o a Recursos Humanos.',
    ] },
];

// ─── Renderizador ─────────────────────────────────────────────────────────────

export const manualService = {
    generatePayrollManual(params: ManualParams) {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.width;
        const H = doc.internal.pageSize.height;
        const today = params.today ?? new Date().toISOString().split('T')[0];
        const contentW = W - MARGIN * 2;

        // ── Portada ──────────────────────────────────────────────────────────
        if (params.logoDataUrl) {
            try { doc.addImage(params.logoDataUrl, 'PNG', W / 2 - 16, 55, 32, 32, undefined, 'FAST'); } catch { /* ignore */ }
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(...INK);
        doc.text('Manual de Usuario', W / 2, 110, { align: 'center' });
        doc.setFontSize(15);
        doc.setTextColor(...BLUE);
        doc.text('Módulo de Nómina y Mi Nómina', W / 2, 122, { align: 'center' });

        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.6);
        doc.line(W / 2 - 30, 130, W / 2 + 30, 130);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...MUTED);
        doc.text(params.companyName, W / 2, 142, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Versión del ${fmtDate(today)}`, W / 2, 150, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text('Documento guía para el uso del sistema. Generado electrónicamente.', W / 2, H - 20, { align: 'center' });

        // ── Cuerpo ───────────────────────────────────────────────────────────
        let page = 1;
        const startBodyPage = () => {
            doc.addPage();
            page += 1;
            // Encabezado corrido
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.text('MANUAL DE USUARIO · NÓMINA', MARGIN, 12);
            doc.text(params.companyName, W - MARGIN, 12, { align: 'right' });
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(MARGIN, 15, W - MARGIN, 15);
            // Pie con número de página
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.text(`Página ${page - 1}`, W - MARGIN, H - 10, { align: 'right' });
            return 24;
        };

        let y = startBodyPage();

        const ensure = (needed: number) => {
            if (y + needed > H - 16) y = startBodyPage();
        };

        for (const b of CONTENT) {
            if (b.t === 'h1') {
                ensure(16);
                y += 4;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(...INK);
                doc.text(b.x, MARGIN, y);
                doc.setDrawColor(...BLUE);
                doc.setLineWidth(1.2);
                doc.line(MARGIN, y + 2.4, MARGIN + Math.min(doc.getTextWidth(b.x), 80), y + 2.4);
                y += 10;
            } else if (b.t === 'h2') {
                ensure(12);
                y += 2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...BLUE);
                doc.text(b.x, MARGIN, y);
                y += 7;
            } else if (b.t === 'p') {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(...INK);
                const lines = doc.splitTextToSize(b.x, contentW);
                for (const ln of lines) {
                    ensure(6);
                    doc.text(ln, MARGIN, y);
                    y += 5.4;
                }
                y += 2;
            } else if (b.t === 'ul') {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(...INK);
                for (const item of b.items) {
                    const lines = doc.splitTextToSize(item, contentW - 6);
                    ensure(lines.length * 5.4 + 1);
                    doc.setFillColor(...BLUE);
                    doc.circle(MARGIN + 1.4, y - 1.4, 0.8, 'F');
                    doc.text(lines, MARGIN + 6, y);
                    y += lines.length * 5.4 + 1.5;
                }
                y += 2;
            } else if (b.t === 'note') {
                const lines = doc.splitTextToSize(b.x, contentW - 8);
                const boxH = lines.length * 5.2 + 6;
                ensure(boxH + 2);
                doc.setFillColor(...SOFT);
                doc.setDrawColor(...BLUE);
                doc.setLineWidth(0.3);
                doc.roundedRect(MARGIN, y - 4, contentW, boxH, 2, 2, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...BLUE);
                doc.text('NOTA', MARGIN + 4, y + 1);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(...INK);
                doc.text(lines, MARGIN + 18, y + 1);
                y += boxH + 3;
            }
        }

        doc.save('Manual-Nomina-y-Mi-Nomina.pdf');
    },
};
