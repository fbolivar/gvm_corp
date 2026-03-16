"use client"

import { useState, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import { bankService, VendorPayment } from "@/features/payroll/services/bankService"
import { cn } from "@/shared/lib/utils"
import { Download, FileSpreadsheet, Building2, CheckSquare, Square, AlertTriangle } from "lucide-react"

interface PendingBill {
    id: string
    number: string
    total: number
    balance: number
    issue_date: string
    due_date: string | null
    party: {
        id: string
        legal_name: string
        trade_name?: string
        doc_type?: string
        doc_number?: string
        bank_name?: string
        bank_account_type?: string
        bank_account_number?: string
    } | null
}

interface Props {
    pendingBills: PendingBill[]
}

type FileFormat = 'CSV' | 'BANCOLOMBIA_PAB' | 'DAVIVIENDA_TXT'

export function VendorPaymentFileGenerator({ pendingBills }: Props) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [format, setFormat] = useState<FileFormat>('CSV')
    const [sourceAccount, setSourceAccount] = useState('')
    const [companyNit, setCompanyNit] = useState('')

    const fmt = (n: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAll = () => {
        if (selectedIds.size === pendingBills.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(pendingBills.map(b => b.id)))
    }

    const selectedBills = useMemo(
        () => pendingBills.filter(b => selectedIds.has(b.id)),
        [pendingBills, selectedIds]
    )

    const totalSelected = useMemo(
        () => selectedBills.reduce((sum, b) => sum + (b.balance || b.total), 0),
        [selectedBills]
    )

    const missingBankInfo = selectedBills.filter(b => !b.party?.bank_account_number)

    const handleGenerate = () => {
        if (selectedBills.length === 0) {
            toast.error("Selecciona al menos una factura")
            return
        }
        if (missingBankInfo.length > 0) {
            toast.error(`${missingBankInfo.length} proveedor(es) sin datos bancarios`)
            return
        }
        if (format === 'BANCOLOMBIA_PAB' && !sourceAccount.trim()) {
            toast.error("Ingresa la cuenta origen")
            return
        }
        if (format === 'DAVIVIENDA_TXT' && !companyNit.trim()) {
            toast.error("Ingresa el NIT de la empresa")
            return
        }

        const payments: VendorPayment[] = selectedBills.map(b => ({
            party_name: b.party?.trade_name || b.party?.legal_name || '',
            doc_type: b.party?.doc_type || 'NIT',
            doc_number: b.party?.doc_number || '',
            bank_name: b.party?.bank_name || 'BANCOLOMBIA',
            account_type: (b.party?.bank_account_type === 'SAVINGS' ? 'SAVINGS' : 'CHECKING') as 'SAVINGS' | 'CHECKING',
            account_number: b.party?.bank_account_number || '',
            amount: b.balance || b.total,
            reference: b.number || '',
        }))

        let content: string
        let filename: string
        const dateStr = new Date().toISOString().split('T')[0]

        switch (format) {
            case 'CSV':
                content = bankService.generateVendorPaymentCSV(payments)
                filename = `pagos_proveedores_${dateStr}.csv`
                break
            case 'BANCOLOMBIA_PAB':
                content = bankService.generateVendorBancolombiaPAB(payments, sourceAccount.trim())
                filename = `pago_proveedores_bancolombia_${dateStr}.txt`
                break
            case 'DAVIVIENDA_TXT':
                content = bankService.generateVendorDaviviendaTXT(payments, companyNit.trim())
                filename = `pago_proveedores_davivienda_${dateStr}.txt`
                break
        }

        bankService.downloadFile(content, filename)
        toast.success(`Archivo generado: ${filename}`)
    }

    const isOverdue = (dueDate: string | null) => {
        if (!dueDate) return false
        return new Date(dueDate) < new Date()
    }

    return (
        <div className="space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Facturas Pendientes</p>
                    <p className="text-3xl font-black text-slate-900 mt-2 italic tracking-tighter">{pendingBills.length}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seleccionadas</p>
                    <p className="text-3xl font-black text-indigo-600 mt-2 italic tracking-tighter">{selectedIds.size}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2 italic tracking-tighter">{fmt(totalSelected)}</p>
                </div>
            </div>

            {/* Format Selection + Generate */}
            <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Formato:</p>
                    {(['CSV', 'BANCOLOMBIA_PAB', 'DAVIVIENDA_TXT'] as FileFormat[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFormat(f)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                                format === f
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            )}
                        >
                            {f === 'CSV' ? 'CSV Generico' : f === 'BANCOLOMBIA_PAB' ? 'Bancolombia PAB' : 'Davivienda TXT'}
                        </button>
                    ))}
                </div>

                {format === 'BANCOLOMBIA_PAB' && (
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Cuenta Origen Bancolombia
                        </label>
                        <input
                            type="text"
                            value={sourceAccount}
                            onChange={e => setSourceAccount(e.target.value)}
                            placeholder="Ej: 12345678901"
                            className="w-full md:w-72 h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                )}

                {format === 'DAVIVIENDA_TXT' && (
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            NIT de la Empresa
                        </label>
                        <input
                            type="text"
                            value={companyNit}
                            onChange={e => setCompanyNit(e.target.value)}
                            placeholder="Ej: 900123456"
                            className="w-full md:w-72 h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                )}

                {missingBankInfo.length > 0 && selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-4 py-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p className="text-xs font-medium">
                            {missingBankInfo.length} proveedor(es) sin datos bancarios registrados
                        </p>
                    </div>
                )}

                <Button
                    onClick={handleGenerate}
                    disabled={selectedIds.size === 0}
                    className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Generar Archivo ({selectedIds.size} pagos)
                </Button>
            </div>

            {/* Bills Table */}
            <div className="bg-white rounded-[2rem] shadow-premium border border-slate-50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-4 py-4">
                                    <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                                        {selectedIds.size === pendingBills.length && pendingBills.length > 0
                                            ? <CheckSquare className="h-4 w-4" />
                                            : <Square className="h-4 w-4" />
                                        }
                                    </button>
                                </th>
                                <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Factura
                                </th>
                                <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Proveedor
                                </th>
                                <th className="text-right px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Saldo
                                </th>
                                <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Vencimiento
                                </th>
                                <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Banco
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingBills.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-300">
                                        <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                        <p className="text-xs font-bold uppercase tracking-widest">
                                            Sin facturas pendientes de pago
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                pendingBills.map(bill => (
                                    <tr
                                        key={bill.id}
                                        onClick={() => toggleSelect(bill.id)}
                                        className={cn(
                                            "border-b border-slate-50 cursor-pointer transition-colors",
                                            selectedIds.has(bill.id)
                                                ? "bg-indigo-50/50"
                                                : "hover:bg-slate-50/50"
                                        )}
                                    >
                                        <td className="px-4 py-3">
                                            {selectedIds.has(bill.id)
                                                ? <CheckSquare className="h-4 w-4 text-indigo-600" />
                                                : <Square className="h-4 w-4 text-slate-300" />
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-slate-900">
                                            {bill.number || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="text-sm font-medium text-slate-700">
                                                    {bill.party?.trade_name || bill.party?.legal_name || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-right text-slate-900">
                                            {fmt(bill.balance || bill.total)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {bill.due_date ? (
                                                <Badge className={cn(
                                                    "text-[9px] font-bold rounded-full px-2 py-0.5 border-none",
                                                    isOverdue(bill.due_date)
                                                        ? "bg-rose-50 text-rose-600"
                                                        : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {new Date(bill.due_date).toLocaleDateString('es-CO')}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {bill.party?.bank_name || (
                                                <span className="text-rose-400 font-bold">Sin banco</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
