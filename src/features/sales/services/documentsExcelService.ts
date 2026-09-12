import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { OrderExportData, OrderExportLine } from '../exportActions'

interface CompanyInfo {
    name: string
    nit?: string | null
    address?: string | null
    phone?: string | null
    logoUrl?: string | null
}

export interface ExcelExportOpts {
    title: string
    partyLabel: string
    fileLabel: string
    statusLabels: Record<string, string>
    sheetName?: string
    /** Encabezado de la 4ª columna. En traslados no hay NIT: se usa "Destino". */
    docLabel?: string
    /** Encabezado de la columna de bodega. En traslados se usa "Observaciones". */
    warehouseLabel?: string
    /** Agrega la columna FACTURA (FEV). Solo aplica a pedidos de venta. */
    showInvoice?: boolean
}

const SLATE_900 = 'FF0F172A'
const INDIGO_600 = 'FF4F46E5'
const SLATE_50 = 'FFF8FAFC'
const SLATE_400 = 'FF94A3B8'
const WHITE = 'FFFFFFFF'

async function fetchLogoAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url)
        const blob = await response.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch { return null }
}

function fmtDate(d: string | null): string {
    if (!d) return ''
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : d
}

/**
 * Hoja "Detalle productos": una fila por línea de producto, repitiendo los datos
 * del documento (N°, fecha, cliente) para que se pueda filtrar y hacer tabla
 * dinámica directamente sobre este rango.
 */
function buildDetailSheet(
    wb: ExcelJS.Workbook,
    lines: OrderExportLine[],
    company: CompanyInfo,
    opts: ExcelExportOpts,
) {
    const ws = wb.addWorksheet('Detalle productos', { properties: { defaultColWidth: 16 } })

    // La columna FACTURA solo existe en pedidos de venta: desplaza en 1 todas las
    // columnas siguientes, por eso los índices se calculan con `inv`.
    const inv = opts.showInvoice ? 1 : 0

    ws.columns = [
        { key: 'number', width: 14 },
        { key: 'date', width: 12 },
        { key: 'party', width: 34 },
        { key: 'doc', width: 15 },
        { key: 'status', width: 13 },
        ...(inv ? [{ key: 'invoice', width: 20 }] : []),
        { key: 'sku', width: 14 },
        { key: 'product', width: 42 },
        { key: 'uom', width: 8 },
        { key: 'warehouse', width: 24 },
        { key: 'qty', width: 11 },
        { key: 'price', width: 15 },
        { key: 'base', width: 16 },
        { key: 'rate', width: 8 },
        { key: 'tax', width: 14 },
        { key: 'total', width: 17 },
    ]
    const totalCols = 15 + inv
    const C_QTY = 10 + inv, C_RATE = 13 + inv, C_TOTAL = 15 + inv
    // Columnas numéricas: precio, subtotal, IVA, total
    const MONEY_COLS = [11 + inv, 12 + inv, 14 + inv, 15 + inv]
    let row = 1

    ws.mergeCells(row, 1, row, totalCols)
    const titleCell = ws.getCell(row, 1)
    titleCell.value = `${company.name.toUpperCase()}  ·  ${opts.title} — DETALLE POR PRODUCTO`
    titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: WHITE } }
    titleCell.alignment = { vertical: 'middle' }
    for (let c = 1; c <= totalCols; c++) ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } }
    ws.getRow(row).height = 26; row++

    ws.mergeCells(row, 1, row, totalCols)
    const subCell = ws.getCell(row, 1)
    subCell.value = `Generado: ${format(new Date(), 'PPpp', { locale: es })}  ·  ${lines.length} línea(s)`
    subCell.font = { name: 'Calibri', size: 8, color: { argb: SLATE_400 } }
    subCell.alignment = { vertical: 'middle' }
    for (let c = 1; c <= totalCols; c++) ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } }
    ws.getRow(row).height = 20; row++

    ws.getRow(row).height = 6; row++

    const headers = [
        'N°', 'FECHA', opts.partyLabel.toUpperCase(),
        (opts.docLabel ?? 'NIT / DOC').toUpperCase(), 'ESTADO',
        ...(inv ? ['FACTURA (FEV)'] : []),
        'SKU', 'PRODUCTO', 'UND', (opts.warehouseLabel ?? 'Bodega').toUpperCase(),
        'CANTIDAD', 'PRECIO UNIT.', 'SUBTOTAL', 'IVA %', 'IVA', 'TOTAL',
    ]
    const headerRowIdx = row
    const headerRow = ws.getRow(row)
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1)
        cell.value = h
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } }
        cell.alignment = { horizontal: i >= 9 + inv ? 'right' : 'left', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: INDIGO_600 } } }
    })
    headerRow.height = 22; row++

    lines.forEach((l, idx) => {
        const dataRow = ws.getRow(row)
        const bg = idx % 2 === 0 ? SLATE_50 : WHITE
        const values = [
            l.number ?? '', fmtDate(l.issue_date), l.party_name, l.party_doc,
            opts.statusLabels[l.status] ?? l.status,
            ...(inv ? [l.invoice_numbers ?? ''] : []),
            l.sku, l.product, l.uom, l.warehouse,
            l.qty, l.unit_price, l.base, l.tax_rate / 100, l.tax_amount, l.total,
        ]
        values.forEach((v, i) => {
            const cell = dataRow.getCell(i + 1)
            cell.value = v as string | number
            cell.font = { name: 'Calibri', size: 9, color: { argb: SLATE_900 } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
            cell.alignment = { vertical: 'middle' }
            cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }
        })
        dataRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: INDIGO_600 } }
        if (inv) dataRow.getCell(6).font = { name: 'Calibri', size: 9, bold: true, color: { argb: SLATE_900 } }
        dataRow.getCell(C_QTY).numFmt = '#,##0.##'
        dataRow.getCell(C_QTY).alignment = { horizontal: 'right', vertical: 'middle' }
        dataRow.getCell(C_RATE).numFmt = '0%'
        dataRow.getCell(C_RATE).alignment = { horizontal: 'right', vertical: 'middle' }
        for (const c of MONEY_COLS) {
            const cell = dataRow.getCell(c)
            cell.numFmt = '$#,##0'
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
        }
        dataRow.getCell(C_TOTAL).font = { name: 'Calibri', size: 9, bold: true, color: { argb: SLATE_900 } }
        dataRow.height = 18; row++
    })

    const totalRow = ws.getRow(row)
    ws.mergeCells(row, 1, row, 9 + inv)
    const lbl = totalRow.getCell(1)
    lbl.value = `TOTAL: ${lines.length} línea(s)`
    lbl.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } }
    lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } }
    lbl.alignment = { vertical: 'middle' }
    const sums: Array<[number, number, string]> = [
        [C_QTY, lines.reduce((s, l) => s + l.qty, 0), '#,##0.##'],
        [12 + inv, lines.reduce((s, l) => s + l.base, 0), '$#,##0'],
        [14 + inv, lines.reduce((s, l) => s + l.tax_amount, 0), '$#,##0'],
        [C_TOTAL, lines.reduce((s, l) => s + l.total, 0), '$#,##0'],
    ]
    for (let c = C_QTY; c <= C_TOTAL; c++) {
        totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } }
    }
    sums.forEach(([c, val, fmt]) => {
        const cell = totalRow.getCell(c)
        cell.value = val
        cell.numFmt = fmt
        cell.font = { name: 'Calibri', size: c === C_TOTAL ? 11 : 9, bold: true, color: { argb: WHITE } }
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
    })
    totalRow.height = 24

    // Filtros y encabezado congelado: la hoja de detalle es larga y se navega mucho.
    ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: totalCols } }
    ws.views = [{ state: 'frozen', ySplit: headerRowIdx }]
}

export const documentsExcelService = {
    async export(data: OrderExportData, company: CompanyInfo, opts: ExcelExportOpts) {
        const { rows, lines } = data
        const wb = new ExcelJS.Workbook()
        wb.creator = 'GVM ERP V3'
        wb.created = new Date()
        const ws = wb.addWorksheet(opts.sheetName ?? 'Documentos', { properties: { defaultColWidth: 16 } })

        // La columna FACTURA solo se agrega en pedidos de venta (desplaza en 1 las
        // columnas de importes, por eso los índices se calculan con `inv`).
        const inv = opts.showInvoice ? 1 : 0

        ws.columns = [
            { key: 'number', width: 14 },
            { key: 'date', width: 13 },
            { key: 'party', width: 34 },
            { key: 'doc', width: 16 },
            { key: 'warehouse', width: 22 },
            { key: 'status', width: 14 },
            ...(inv ? [{ key: 'invoice', width: 22 }] : []),
            { key: 'subtotal', width: 16 },
            { key: 'taxes', width: 14 },
            { key: 'total', width: 18 },
        ]
        const totalCols = 9 + inv
        const C_SUBTOTAL = 7 + inv, C_TAXES = 8 + inv, C_TOTAL = 9 + inv
        let row = 1

        if (company.logoUrl) {
            const b64 = await fetchLogoAsBase64(company.logoUrl)
            if (b64) {
                const ext = b64.includes('image/png') ? 'png' : 'jpeg'
                const imageId = wb.addImage({ base64: b64.split(',')[1], extension: ext })
                ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 78, height: 78 } })
                ws.getRow(1).height = 22; ws.getRow(2).height = 22; ws.getRow(3).height = 22
            }
        }

        ws.mergeCells(row, 2, row, totalCols)
        const nameCell = ws.getCell(row, 2)
        nameCell.value = company.name.toUpperCase()
        nameCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: WHITE } }
        nameCell.alignment = { vertical: 'middle' }
        for (let c = 1; c <= totalCols; c++) ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } }
        ws.getRow(row).height = 28; row++

        ws.mergeCells(row, 2, row, totalCols)
        const infoCell = ws.getCell(row, 2)
        const parts: string[] = []
        if (company.nit) parts.push(`NIT: ${company.nit}`)
        if (company.address) parts.push(company.address)
        if (company.phone) parts.push(`TEL: ${company.phone}`)
        infoCell.value = parts.join('  |  ')
        infoCell.font = { name: 'Calibri', size: 9, color: { argb: SLATE_400 } }
        infoCell.alignment = { vertical: 'middle' }
        for (let c = 1; c <= totalCols; c++) ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } }
        ws.getRow(row).height = 18; row++

        ws.mergeCells(row, 1, row, 5)
        const titleCell = ws.getCell(row, 1)
        titleCell.value = opts.title
        titleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }
        titleCell.alignment = { vertical: 'middle' }
        ws.mergeCells(row, 6, row, totalCols)
        const dateCell = ws.getCell(row, 6)
        dateCell.value = `Generado: ${format(new Date(), 'PPpp', { locale: es })}`
        dateCell.font = { name: 'Calibri', size: 8, color: { argb: SLATE_400 } }
        dateCell.alignment = { vertical: 'middle', horizontal: 'right' }
        for (let c = 1; c <= totalCols; c++) ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } }
        ws.getRow(row).height = 22; row++

        ws.getRow(row).height = 6; row++

        const headers = [
            'N°', 'FECHA', opts.partyLabel.toUpperCase(),
            (opts.docLabel ?? 'NIT / DOC').toUpperCase(),
            (opts.warehouseLabel ?? 'Bodega').toUpperCase(),
            'ESTADO',
            ...(inv ? ['FACTURA (FEV)'] : []),
            'SUBTOTAL', 'IVA', 'TOTAL',
        ]
        const headerRow = ws.getRow(row)
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1)
            cell.value = h
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } }
            cell.alignment = { horizontal: i >= 6 + inv ? 'right' : 'left', vertical: 'middle' }
            cell.border = { bottom: { style: 'thin', color: { argb: INDIGO_600 } } }
        })
        headerRow.height = 22; row++

        rows.forEach((o, idx) => {
            const dataRow = ws.getRow(row)
            const bg = idx % 2 === 0 ? SLATE_50 : WHITE
            const values = [
                o.number ?? '', fmtDate(o.issue_date), o.party_name, o.party_doc, o.warehouse,
                opts.statusLabels[o.status] ?? o.status,
                ...(inv ? [o.invoice_numbers ?? ''] : []),
                o.subtotal, o.taxes, o.total,
            ]
            values.forEach((v, i) => {
                const cell = dataRow.getCell(i + 1)
                cell.value = v as string | number
                cell.font = { name: 'Calibri', size: 9, color: { argb: SLATE_900 } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
                cell.alignment = { vertical: 'middle' }
                cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }
            })
            dataRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: INDIGO_600 } }
            if (inv) dataRow.getCell(7).font = { name: 'Calibri', size: 9, bold: true, color: { argb: SLATE_900 } }
            for (const c of [C_SUBTOTAL, C_TAXES, C_TOTAL]) {
                const cell = dataRow.getCell(c)
                cell.numFmt = '$#,##0'
                cell.alignment = { horizontal: 'right', vertical: 'middle' }
            }
            dataRow.getCell(C_TOTAL).font = { name: 'Calibri', size: 9, bold: true, color: { argb: SLATE_900 } }
            dataRow.height = 18; row++
        })

        const totalRow = ws.getRow(row)
        ws.mergeCells(row, 1, row, 6 + inv)
        const lbl = totalRow.getCell(1)
        lbl.value = `TOTAL: ${rows.length} registro(s)`
        lbl.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } }
        lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } }
        lbl.alignment = { vertical: 'middle' }
        const sums: [number, number][] = [
            [C_SUBTOTAL, rows.reduce((s, o) => s + o.subtotal, 0)],
            [C_TAXES, rows.reduce((s, o) => s + o.taxes, 0)],
            [C_TOTAL, rows.reduce((s, o) => s + o.total, 0)],
        ]
        sums.forEach(([c, val]) => {
            const cell = totalRow.getCell(c)
            cell.value = val
            cell.numFmt = '$#,##0'
            cell.font = { name: 'Calibri', size: c === C_TOTAL ? 11 : 9, bold: true, color: { argb: WHITE } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } }
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
        })
        totalRow.height = 24

        // Hoja 2: una fila por producto. Sirve para tabla dinámica (qué se vendió,
        // cuánto y a quién), que la hoja resumen no permite responder.
        if (lines.length > 0) buildDetailSheet(wb, lines, company, opts)

        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${opts.fileLabel}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    },
}
