import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { TeamMember, TenantInfo, Zone } from './settingsService'

const COLORS = {
    ink: [17, 17, 17] as [number, number, number],
    dark: [60, 60, 60] as [number, number, number],
    mid: [107, 114, 128] as [number, number, number],
    grayHeader: [0, 150, 230] as [number, number, number],   // #0096E6 azul corporativo
    grayBandLight: [233, 244, 252] as [number, number, number],
    line: [203, 213, 225] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
}

const MARGIN = 12
const PW = 210
const PH = 297

function displayLogin(email: string | null | undefined): string {
    if (!email) return '—'
    if (email.endsWith('@users.gvm.local')) return email.split('@')[0]
    return email
}

function formatStatus(s?: string): string {
    if (!s) return '—'
    const map: Record<string, string> = {
        active: 'Activo',
        ACTIVE: 'Activo',
        inactive: 'Inactivo',
        INACTIVE: 'Inactivo',
        pending: 'Pendiente',
        PENDING: 'Pendiente',
    }
    return map[s] ?? s
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' })
}

function fmtDateLong(): string {
    const d = new Date()
    return d.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

/** Carga una imagen y la devuelve como dataURL base64, o null si falla. */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, { cache: 'force-cache' })
        if (!res.ok) return null
        const blob = await res.blob()
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

export async function generateUsersReportPdf(params: {
    tenant: TenantInfo | null
    members: TeamMember[]
    zones: Zone[]
    generatedBy?: string
}): Promise<void> {
    const { tenant, members, zones, generatedBy } = params

    // Fallback a logo local si no hay logo de tenant configurado
    const logoUrl = tenant?.logo_url || '/logo-gvm.png'
    const logoDataUrl = await loadImageAsDataUrl(logoUrl)

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    const zoneById = new Map(zones.map(z => [z.id, z.name]))

    const companyName = tenant?.name ?? 'GVM S.A.S'
    const companyNit = tenant?.nit ? `NIT ${tenant.nit}${tenant.dv ? `-${tenant.dv}` : ''}` : ''
    const companyAddr = [tenant?.address, tenant?.city, tenant?.department]
        .filter(Boolean)
        .join(', ')
    const companyContact = [tenant?.phone, tenant?.email, tenant?.website]
        .filter(Boolean)
        .join(' · ')

    // ─── HEADER (se redibuja en cada página via didDrawPage) ──────────────
    const drawHeader = () => {
        // Banda superior
        doc.setFillColor(...COLORS.grayHeader)
        doc.rect(0, 0, PW, 28, 'F')

        // Logo
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', MARGIN, 6, 16, 16)
            } catch {
                // si falla, continúa sin logo
            }
        }

        // Empresa
        doc.setTextColor(...COLORS.white)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(companyName.toUpperCase(), MARGIN + 20, 12)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        if (companyNit) doc.text(companyNit, MARGIN + 20, 17)
        if (companyAddr) doc.text(companyAddr, MARGIN + 20, 21)
        if (companyContact) doc.text(companyContact, MARGIN + 20, 25)

        // Título a la derecha
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text('REPORTE DE USUARIOS', PW - MARGIN, 14, { align: 'right' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.text(`Generado: ${fmtDateLong()}`, PW - MARGIN, 19, { align: 'right' })
        doc.text(`Total: ${members.length} usuario(s)`, PW - MARGIN, 23, { align: 'right' })
    }

    // ─── FOOTER ───────────────────────────────────────────────────────────
    const drawFooter = (data: { pageNumber: number }) => {
        const totalPages = doc.getNumberOfPages()

        // Línea separadora
        doc.setDrawColor(...COLORS.line)
        doc.setLineWidth(0.2)
        doc.line(MARGIN, PH - 14, PW - MARGIN, PH - 14)

        doc.setTextColor(...COLORS.mid)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)

        // Izquierda: generador
        if (generatedBy) {
            doc.text(`Generado por: ${generatedBy}`, MARGIN, PH - 9)
        }

        // Centro: sistema
        doc.text(
            'GVM Corp — Sistema ERP · Documento confidencial',
            PW / 2,
            PH - 9,
            { align: 'center' }
        )

        // Derecha: paginación
        doc.text(
            `Página ${data.pageNumber} de ${totalPages}`,
            PW - MARGIN,
            PH - 9,
            { align: 'right' }
        )

        // Marca inferior
        doc.setFontSize(6)
        doc.text(`© ${new Date().getFullYear()} ${companyName}`, PW / 2, PH - 5, { align: 'center' })
    }

    // ─── DATOS DE LA TABLA ────────────────────────────────────────────────
    const rows = members.map((m, idx) => [
        String(idx + 1),
        (m.full_name ?? 'Sin nombre').toUpperCase(),
        displayLogin(m.email),
        m.role_name ?? m.role ?? '—',
        m.zone_id ? (zoneById.get(m.zone_id) ?? '—') : (m.zone_name ?? '—'),
        formatStatus(m.status),
        fmtDate(m.created_at),
    ])

    autoTable(doc, {
        head: [['#', 'Nombre Completo', 'Usuario', 'Rol', 'Zona', 'Estado', 'Creado']],
        body: rows,
        startY: 34,
        margin: { top: 34, bottom: 20, left: MARGIN, right: MARGIN },
        styles: {
            font: 'helvetica',
            fontSize: 8,
            textColor: COLORS.ink,
            lineColor: COLORS.line,
            lineWidth: 0.1,
            cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
        },
        headStyles: {
            fillColor: COLORS.grayHeader,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
        },
        alternateRowStyles: {
            fillColor: COLORS.grayBandLight,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 48, fontStyle: 'bold' },
            2: { cellWidth: 32 },
            3: { cellWidth: 40 },
            4: { cellWidth: 25 },
            5: { cellWidth: 18 },
            6: { cellWidth: 'auto', halign: 'center' },
        },
        didDrawPage: (data) => {
            drawHeader()
            drawFooter({ pageNumber: data.pageNumber })
        },
    })

    // Si la tabla es vacía, muestra un aviso centrado
    if (rows.length === 0) {
        doc.setTextColor(...COLORS.mid)
        doc.setFontSize(10)
        doc.text('No hay usuarios registrados', PW / 2, 80, { align: 'center' })
    }

    const fileDate = new Date().toISOString().slice(0, 10)
    doc.save(`reporte-usuarios-${fileDate}.pdf`)
}
