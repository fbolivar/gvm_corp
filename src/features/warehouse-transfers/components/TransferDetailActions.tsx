"use client"

import { useState, useRef, useMemo } from "react";
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

// ─── Formulario de recepción ───────────────────────────────────────────────────

interface ReceiveFormProps {
    transferId: string;
    transferNumber: string;
    fromWarehouse: string;
    toWarehouse: string;
    lines: Array<TransferLine & { id?: string; product?: { name: string; sku: string } }>;
    onSuccess: () => void;
    onCancel: () => void;
}

/** Un renglón de la planilla de recepción: un lote de un producto. */
interface ReceiptRow {
    key: string;
    line_id: string;
    lot_number: string;
    expiration_date: string;
    qty: number;
}

let rowSeq = 0;
const newRow = (line_id: string, qty = 0): ReceiptRow => ({
    key: `r${++rowSeq}`,
    line_id,
    lot_number: '',
    expiration_date: '',
    qty,
});

function ReceiveForm({
    transferId,
    transferNumber,
    fromWarehouse,
    toWarehouse,
    lines,
    onSuccess,
    onCancel,
}: ReceiveFormProps) {
    // Arranca con un renglón por línea, ya con la cantidad pendiente sugerida:
    // lo normal es que llegue completo y solo haya que escribir el lote.
    const [rows, setRows] = useState<ReceiptRow[]>(() =>
        lines.map((l) =>
            newRow(l.id ?? '', Math.max(0, Number(l.qty) - Number(l.qty_received ?? 0))),
        ),
    );
    const [loading, setLoading] = useState(false);
    const submittingRef = useRef(false);

    const lineById = useMemo(
        () => new Map(lines.map((l) => [l.id ?? '', l])),
        [lines],
    );

    /** Pendiente de una línea descontando lo que ya se escribió en esta pantalla. */
    function pendingFor(lineId: string, exceptKey?: string): number {
        const line = lineById.get(lineId);
        if (!line) return 0;
        const enviado = Math.max(0, Number(line.qty) - Number(line.qty_received ?? 0));
        const escrito = rows
            .filter((r) => r.line_id === lineId && r.key !== exceptKey)
            .reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
        return Math.max(0, enviado - escrito);
    }

    function update(key: string, patch: Partial<ReceiptRow>) {
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    }

    function addLot(lineId: string) {
        setRows((prev) => [...prev, newRow(lineId)]);
    }

    function removeRow(key: string) {
        setRows((prev) => prev.filter((r) => r.key !== key));
    }

    async function handleReceive() {
        if (submittingRef.current) return;

        const payload = rows
            .filter((r) => Number(r.qty) > 0)
            .map((r) => ({
                line_id: r.line_id,
                lot_number: r.lot_number.trim() || null,
                expiration_date: r.expiration_date || null,
                qty: Number(r.qty),
            }));

        if (payload.length === 0) {
            toast.error('Escribe la cantidad recibida de al menos un producto.');
            return;
        }

        submittingRef.current = true;
        setLoading(true);
        try {
            const result = await receiveTransferAction(transferId, payload);
            if (result.error && !result.success) {
                toast.error(result.error);
                return;
            }
            if (result.error) {
                toast.warning(result.error);
            } else {
                toast.success('Recepción registrada', {
                    description: 'El inventario ya se movió de ' + fromWarehouse + ' a ' + toWarehouse + '.',
                });
            }
            onSuccess();
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center gap-3">
                <PackageCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Registrar recepción de mercancía
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                    {transferNumber} &bull; {fromWarehouse} → {toWarehouse}
                </span>
            </div>

            <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500">
                    Escribe lo que llegó pieza por pieza. Al confirmar, las unidades salen de{' '}
                    <span className="font-semibold text-slate-700">{fromWarehouse}</span> y entran a{' '}
                    <span className="font-semibold text-slate-700">{toWarehouse}</span>.
                    Si un producto llegó en dos lotes, usa <span className="font-semibold">Otro lote</span>.
                </p>

                <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full min-w-[720px] border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-left">
                                {['Código', 'Referencia', 'Lote', 'Vence', 'Cant. recibida', ''].map((h) => (
                                    <th
                                        key={h}
                                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 pb-1"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const line = lineById.get(row.line_id);
                                const max = pendingFor(row.line_id, row.key);
                                const isExtra =
                                    rows.filter((r) => r.line_id === row.line_id).indexOf(row) > 0;
                                return (
                                    <tr key={row.key} className="bg-slate-50">
                                        <td className="px-3 py-3 rounded-l-2xl align-middle">
                                            <span className="text-[11px] font-mono font-bold text-slate-500">
                                                {line?.product?.sku ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-middle max-w-[220px]">
                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                {line?.product?.name ?? line?.description ?? 'Producto'}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                Pendiente: {max}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 align-middle">
                                            <input
                                                type="text"
                                                value={row.lot_number}
                                                onChange={(e) => update(row.key, { lot_number: e.target.value })}
                                                placeholder="EN0117"
                                                className="w-28 h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold uppercase text-slate-900 outline-none focus:border-emerald-300"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-middle">
                                            <input
                                                type="date"
                                                value={row.expiration_date}
                                                onChange={(e) => update(row.key, { expiration_date: e.target.value })}
                                                className="w-40 h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-300"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-middle">
                                            <input
                                                type="number"
                                                min={0}
                                                max={max}
                                                step="any"
                                                value={row.qty}
                                                onChange={(e) =>
                                                    update(row.key, {
                                                        qty: Math.min(max, Math.max(0, Number(e.target.value))),
                                                    })
                                                }
                                                className="w-28 h-10 text-right bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold tabular-nums text-slate-900 outline-none focus:border-emerald-300"
                                            />
                                        </td>
                                        <td className="px-3 py-3 rounded-r-2xl align-middle whitespace-nowrap">
                                            {isExtra ? (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(row.key)}
                                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500"
                                                >
                                                    Quitar
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => addLot(row.line_id)}
                                                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-500"
                                                >
                                                    + Otro lote
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
                                Registrando recepción...
                            </>
                        ) : (
                            <>
                                <PackageCheck className="h-4 w-4 mr-2" />
                                Confirmar recepción
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
                            transferNumber={transfer.transfer_number}
                            fromWarehouse={transfer.from_warehouse?.name ?? 'origen'}
                            toWarehouse={transfer.to_warehouse?.name ?? 'destino'}
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
