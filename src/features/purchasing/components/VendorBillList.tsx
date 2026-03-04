"use client"

import { useState } from "react"
import { Document } from "@/features/documents/types"
import { Button } from "@/shared/components/ui/button"
import {
    FileCheck,
    Eye,
    Receipt,
    Calendar,
    ArrowUpRight,
    Search,
    Banknote,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShieldCheck,
    Loader2
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/lib/utils"
import { approveVendorBillAction } from "../actions"
import { useToast } from "@/shared/hooks/use-toast"
import { useRouter } from "next/navigation"

interface VendorBillListProps {
    bills: Document[]
}

const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: 'Pendiente', className: 'bg-slate-50 text-slate-500', Icon: Clock },
    SENT: { label: 'Contabilizada', className: 'bg-blue-50 text-blue-600', Icon: Banknote },
    ACCEPTED: { label: 'Saldada', className: 'bg-emerald-50 text-emerald-600', Icon: CheckCircle2 },
    CANCELLED: { label: 'Anulada', className: 'bg-rose-50 text-rose-600', Icon: AlertCircle },
};

export function VendorBillList({ bills }: VendorBillListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const router = useRouter();

    const handleApprove = async (id: string) => {
        setApprovingIds(prev => new Set(prev).add(id));
        const result = await approveVendorBillAction(id);

        if (result.success) {
            toast({ title: "Factura validada", description: "La factura ha sido contabilizada correctamente." });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error || "No se pudo aprobar la factura.", variant: "destructive" });
        }
        setApprovingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const filteredBills = bills.filter(bill =>
        bill.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-0">
            {/* Search bar */}
            <div className="px-5 py-3 border-b border-slate-100">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar factura o proveedor..."
                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            {filteredBills.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                        <FileCheck className="h-6 w-6 text-slate-300" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Sin Obligaciones</h3>
                        <p className="text-xs text-slate-400 mt-1">No hay facturas que coincidan con la busqueda</p>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full" role="table">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th scope="col" className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Proveedor</th>
                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vencimiento</th>
                                <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                                <th scope="col" className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredBills.map((bill) => {
                                const config = STATUS_CONFIG[bill.status] || STATUS_CONFIG.DRAFT;
                                const { Icon } = config;

                                return (
                                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                    <Receipt className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 leading-snug truncate">
                                                        {bill.party?.legal_name || 'Proveedor desconocido'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        Folio: {bill.number}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold", config.className)}>
                                                <Icon className="h-3 w-3" />
                                                {config.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                                                <span className="text-[10px] text-slate-400">{bill.due_date || bill.issue_date || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                                ${bill.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {bill.status === 'DRAFT' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => bill.id && handleApprove(bill.id)}
                                                        disabled={approvingIds.has(bill.id || '')}
                                                        className="h-8 px-3 rounded-xl text-xs font-semibold border-amber-100 text-amber-700 hover:bg-amber-50 gap-1.5"
                                                    >
                                                        {approvingIds.has(bill.id || '') ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <ShieldCheck className="h-3 w-3" />
                                                                Validar
                                                            </>
                                                        )}
                                                    </Button>
                                                )}

                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" asChild title="Ver Detalle">
                                                    <Link href={`/documents/${bill.id}`}>
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>

                                                {bill.status === 'SENT' && (
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-indigo-100 text-indigo-500 hover:bg-indigo-50" asChild title="Programar Pago">
                                                        <Link href={`/treasury/payments/new?billId=${bill.id}`}>
                                                            <ArrowUpRight className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
