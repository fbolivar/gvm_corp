"use client"

import { useState } from "react";
import { DocumentForm, type CommercialOption } from '@/features/documents/components/DocumentForm';
import { createSalesDocumentAction } from '@/features/sales/actions';
import { Document } from "@/features/documents/types";
import { Party } from "@/features/parties/types";
import { Product } from "@/features/products/types";
import { Warehouse } from "@/features/inventory/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { CheckCircle2, Eye, Plus, ListChecks, X, Printer } from "lucide-react";

interface Props {
    parties: Party[];
    products: Product[];
    warehouses?: Warehouse[];
    tenantId?: string;
    commercials?: CommercialOption[];
}

interface Confirmation {
    id?: string;
    number?: string;
    total: number;
    client: string;
    label: string;
    listPath: string;
    isPurchase: boolean;
}

function fmtCOP(n: number): string {
    return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

export default function NewOrderClient({ parties, products, warehouses = [], tenantId, commercials = [] }: Props) {
    const router = useRouter();
    const [confirm, setConfirm] = useState<Confirmation | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data: Document) => {
        const isPurchase = data.doc_type === 'PURCHASE_ORDER' || data.doc_type === 'VENDOR_BILL';
        const listPath = isPurchase ? '/documents' : '/sales/orders';

        setLoading(true);
        let result;
        try {
            result = await createSalesDocumentAction(data, listPath);
        } finally {
            setLoading(false);
        }
        if (result?.error) {
            toast.error(result.error);
            throw new Error(result.error);
        }

        const label = isPurchase ? 'Orden de compra' : 'Pedido';
        const resData = (result as { data?: { id?: string; number?: string; total?: number } })?.data;
        const clientName = parties.find((p) => p.id === data.party_id)?.legal_name || 'Consumidor Final';

        // Ventana de confirmación (en vez de redirigir en silencio)
        setConfirm({
            id: resData?.id,
            number: resData?.number,
            total: Number(resData?.total ?? data.total ?? 0),
            client: clientName,
            label,
            listPath,
            isPurchase,
        });
    };

    return (
        <>
            <DocumentForm
                parties={parties}
                products={products}
                warehouses={warehouses}
                onSubmit={handleSubmit}
                isLoading={loading}
                initialData={{ doc_type: 'SALES_ORDER' } as unknown as Document}
                tenantId={tenantId}
                commercials={commercials}
            />

            {/* ── Ventana de confirmación ─────────────────────────────────── */}
            {confirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
                        {/* Cabecera de éxito */}
                        <div className="bg-emerald-50 px-8 pt-8 pb-6 text-center relative">
                            <button
                                type="button"
                                onClick={() => router.push(confirm.listPath)}
                                className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                                aria-label="Cerrar"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-black text-emerald-900 italic tracking-tight">
                                ¡{confirm.label} registrado!
                            </h2>
                            <p className="text-sm text-emerald-700 font-medium mt-1">
                                El documento quedó guardado correctamente.
                            </p>
                        </div>

                        {/* Detalle */}
                        <div className="px-8 py-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número</span>
                                <span className="text-sm font-black text-slate-900 font-mono">{confirm.number ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</span>
                                <span className="text-sm font-bold text-slate-700 truncate max-w-[220px] text-right">{confirm.client}</span>
                            </div>
                            <div className="h-px bg-slate-100 my-1" />
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                <span className="text-xl font-black text-slate-900 italic">{fmtCOP(confirm.total)} <span className="text-xs text-slate-400 not-italic">COP</span></span>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="px-8 pb-8 space-y-2">
                            {confirm.id && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        asChild
                                        className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest gap-1.5"
                                    >
                                        <Link href={`/documents/${confirm.id}`}>
                                            <Eye className="h-4 w-4" /> Ver
                                        </Link>
                                    </Button>
                                    {!confirm.isPurchase && (
                                        <Button
                                            onClick={() => window.open(`/print/sales-order?id=${confirm.id}`, '_blank')}
                                            className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest gap-1.5"
                                        >
                                            <Printer className="h-4 w-4" /> Imprimir
                                        </Button>
                                    )}
                                    {confirm.isPurchase && (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push(confirm.listPath)}
                                            className="h-12 rounded-2xl border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest gap-1.5"
                                        >
                                            <ListChecks className="h-3.5 w-3.5" /> Lista
                                        </Button>
                                    )}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => { window.location.href = '/sales/orders/new'; }}
                                    className="h-11 rounded-2xl border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Crear otro
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(confirm.listPath)}
                                    className="h-11 rounded-2xl border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest gap-1.5"
                                >
                                    <ListChecks className="h-3.5 w-3.5" /> Ir a la lista
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
