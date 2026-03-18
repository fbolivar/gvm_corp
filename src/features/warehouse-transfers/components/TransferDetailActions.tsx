"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Send,
    XCircle,
    PackageCheck,
    Loader2,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
    sendTransferAction,
    cancelTransferAction,
    receiveTransferAction,
} from "@/features/warehouse-transfers/actions/transferActions";
import { TransferWithDetails, TransferStatus, TransferLine } from "@/features/warehouse-transfers/types";
import { useConfirm } from "@/shared/hooks/useConfirm";

// ─── Receive Form (inline) ─────────────────────────────────────────────────────

interface ReceiveFormProps {
    transferId: string;
    lines: Array<TransferLine & { id?: string; product?: { name: string; sku: string } }>;
    onSuccess: () => void;
    onCancel: () => void;
}

function ReceiveForm({ transferId, lines, onSuccess, onCancel }: ReceiveFormProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>(
        Object.fromEntries(
            lines.map((l) => [
                l.id ?? l.product_id,
                Math.max(0, Number(l.qty) - Number(l.qty_received ?? 0)),
            ])
        )
    );
    const [loading, setLoading] = useState(false);

    async function handleReceive() {
        const activeLines = lines
            .filter((l) => (quantities[l.id ?? l.product_id] ?? 0) > 0)
            .map((l) => ({
                line_id: l.id!,
                qty_received: quantities[l.id ?? l.product_id] ?? 0,
            }));

        if (activeLines.length === 0) {
            toast.error("Ingrese al menos una cantidad a recibir");
            return;
        }

        setLoading(true);
        try {
            const result = await receiveTransferAction(transferId, activeLines);
            if (result.error && !result.success) {
                toast.error(result.error);
            } else {
                if (result.error) {
                    toast.warning(result.error);
                } else {
                    toast.success("Recepción registrada exitosamente");
                }
                onSuccess();
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                <PackageCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Registrar Recepción de Mercancía
                </span>
            </div>

            <div className="p-6 space-y-4">
                {/* Lines */}
                <div className="space-y-3">
                    {lines.map((line) => {
                        const maxQty = Math.max(0, Number(line.qty) - Number(line.qty_received ?? 0));
                        const key = line.id ?? line.product_id;
                        return (
                            <div
                                key={key}
                                className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                        {line.product?.name ?? "Producto desconocido"}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                        {line.product?.sku} &bull; Pendiente: {maxQty}
                                    </p>
                                </div>
                                <div className="shrink-0 w-28">
                                    <input
                                        type="number"
                                        min={0}
                                        max={maxQty}
                                        step="0.01"
                                        value={quantities[key] ?? 0}
                                        onChange={(e) =>
                                            setQuantities((prev) => ({
                                                ...prev,
                                                [key]: Math.min(
                                                    maxQty,
                                                    Math.max(0, Number(e.target.value))
                                                ),
                                            }))
                                        }
                                        className="w-full h-10 text-right bg-white border-none rounded-xl font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 text-sm tabular-nums outline-none px-3"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={loading}
                        className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleReceive}
                        disabled={loading}
                        className="flex-1 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Registrando Recepción...
                            </>
                        ) : (
                            <>
                                <PackageCheck className="h-4 w-4 mr-2" />
                                Confirmar Recepción
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
    transfer: TransferWithDetails;
}

export function TransferDetailActions({ transfer }: Props) {
    const router = useRouter();
    const status = transfer.status as TransferStatus;
    const [ConfirmDialogEl, confirmFn] = useConfirm();

    const [loadingSend, setLoadingSend] = useState(false);
    const [loadingCancel, setLoadingCancel] = useState(false);
    const [showReceiveForm, setShowReceiveForm] = useState(false);

    // DRAFT actions
    async function handleSend() {
        setLoadingSend(true);
        try {
            const result = await sendTransferAction(transfer.id!);
            if (result.error && !result.success) {
                toast.error(result.error);
            } else {
                if (result.error) {
                    toast.warning(result.error);
                } else {
                    toast.success("Traslado enviado en tránsito");
                }
                router.refresh();
            }
        } finally {
            setLoadingSend(false);
        }
    }

    async function handleCancel() {
        const ok = await confirmFn({ title: "Confirmar", description: "¿Está seguro de anular este traslado?", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;
        setLoadingCancel(true);
        try {
            const result = await cancelTransferAction(transfer.id!);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Traslado anulado");
                router.refresh();
            }
        } finally {
            setLoadingCancel(false);
        }
    }

    // Nothing to show for RECEIVED or CANCELLED
    if (status === "RECEIVED" || status === "CANCELLED") {
        return null;
    }

    const isAnyLoading = loadingSend || loadingCancel;

    return (
        <div className="space-y-6">
            {ConfirmDialogEl}
            {/* DRAFT actions */}
            {status === "DRAFT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Send to IN_TRANSIT */}
                    <Button
                        type="button"
                        disabled={isAnyLoading}
                        onClick={handleSend}
                        className="h-16 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loadingSend ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                                Enviando Traslado...
                            </>
                        ) : (
                            <>
                                <Send className="h-5 w-5 mr-3" />
                                Enviar Traslado
                            </>
                        )}
                    </Button>

                    {/* Cancel */}
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={isAnyLoading}
                        onClick={handleCancel}
                        className="h-16 rounded-2xl border-2 border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-700 font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loadingCancel ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                                Anulando...
                            </>
                        ) : (
                            <>
                                <XCircle className="h-5 w-5 mr-3" />
                                Anular Traslado
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* IN_TRANSIT actions */}
            {status === "IN_TRANSIT" && (
                <>
                    {showReceiveForm ? (
                        <ReceiveForm
                            transferId={transfer.id!}
                            lines={
                                transfer.lines as Array<
                                    TransferLine & { id?: string; product?: { name: string; sku: string } }
                                >
                            }
                            onSuccess={() => {
                                setShowReceiveForm(false);
                                router.refresh();
                            }}
                            onCancel={() => setShowReceiveForm(false)}
                        />
                    ) : (
                        <div className="flex flex-col sm:flex-row items-stretch gap-4">
                            <Button
                                type="button"
                                onClick={() => setShowReceiveForm(true)}
                                className="h-16 flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
                            >
                                <PackageCheck className="h-5 w-5 mr-3" />
                                Recibir Traslado
                            </Button>

                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                                    Mercancía en camino — Confirme la recepción física
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
