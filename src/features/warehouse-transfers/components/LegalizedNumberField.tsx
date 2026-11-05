"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, Pencil, FileCheck2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { setLegalizedNumberAction } from "@/features/warehouse-transfers/actions/transferActions";

interface Props {
    transferId: string;
    initialValue?: string | null;
}

/**
 * Muestra y permite editar el "número de traslado legalizado" (el consecutivo con
 * el que el traslado queda legalizado en el sistema contable, p. ej. WorldOffice).
 * Editable en cualquier estado, porque la legalización ocurre después del flujo.
 */
export function LegalizedNumberField({ transferId, initialValue }: Props) {
    const router = useRouter();
    const [value, setValue] = useState(initialValue ?? "");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const current = initialValue?.trim() || "";

    async function handleSave() {
        setSaving(true);
        try {
            const result = await setLegalizedNumberAction(transferId, value.trim() || null);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success(
                value.trim() ? "Número legalizado guardado" : "Número legalizado eliminado",
            );
            setEditing(false);
            router.refresh();
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setValue(current);
        setEditing(false);
    }

    return (
        <div>
            <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <FileCheck2 className="h-3 w-3 text-emerald-500" />
                N.º Legalizado (WorldOffice)
            </dt>

            {editing ? (
                <div className="flex items-center gap-2 mt-1">
                    <Input
                        autoFocus
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                            if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                        }}
                        maxLength={60}
                        placeholder="Ej. TR-12345"
                        className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 uppercase focus-visible:ring-2 focus-visible:ring-emerald-300 outline-none"
                    />
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="h-10 w-10 p-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white shrink-0"
                        aria-label="Guardar número legalizado"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={saving}
                        className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
                        aria-label="Cancelar"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <dd className="text-sm font-bold text-slate-900 font-mono tracking-tight">
                        {current || <span className="text-slate-300 font-sans italic font-medium">Sin registrar</span>}
                    </dd>
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-emerald-600 hover:text-emerald-500 transition-colors"
                        aria-label="Editar número legalizado"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}
