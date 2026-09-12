"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Textarea } from "@/shared/components/ui/textarea"
import { ClipboardCheck, Loader2, Pencil, Save, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { saveFinalNotesAction } from "../actions"

const MAX_LEN = 2000

interface FinalNotesCardProps {
    documentId: string;
    /** Texto ya guardado (null si nunca se ha escrito). */
    value?: string | null;
    /** Fecha ISO de la última edición. */
    updatedAt?: string | null;
}

/**
 * Observaciones finales de un pedido ya cerrado (facturado).
 * Se puede editar en cualquier momento y se imprime al final del PDF del pedido.
 */
export function FinalNotesCard({ documentId, value, updatedAt }: FinalNotesCardProps) {
    const router = useRouter();
    const [editing, setEditing] = useState(!value);
    const [text, setText] = useState(value ?? '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const result = await saveFinalNotesAction(documentId, text);
        setSaving(false);

        if (result.error) {
            toast.error(result.error);
            return;
        }
        toast.success('Observaciones finales guardadas');
        setEditing(false);
        router.refresh();
    };

    const handleCancel = () => {
        setText(value ?? '');
        setEditing(false);
    };

    return (
        <Card className="bg-white border-none shadow-premium rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-start justify-between gap-3">
                <div>
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" /> Observaciones finales
                    </CardTitle>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Pedido facturado · se imprime en el PDF
                    </p>
                </div>
                {!editing && (
                    <Button
                        variant="outline"
                        onClick={() => setEditing(true)}
                        className="h-11 px-4 rounded-xl border-slate-100 bg-white shadow-sm font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 text-[10px] uppercase tracking-widest shrink-0"
                    >
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                    </Button>
                )}
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
                {editing ? (
                    <>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                            placeholder="Ej: Se entregó completo el 04/08. Cliente firma conforme. Diferencia de 2 unidades acordada con el cliente."
                            className="min-h-[140px] rounded-2xl border-slate-200 text-sm leading-relaxed"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-[10px] font-bold text-slate-300 tabular-nums">
                                {text.length}/{MAX_LEN}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                {value !== null && value !== undefined && value !== '' && (
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={saving}
                                        className="h-11 px-4 rounded-xl border-slate-100 bg-white font-black text-slate-400 hover:text-slate-900 text-[10px] uppercase tracking-widest"
                                    >
                                        <X className="mr-2 h-3.5 w-3.5" /> Cancelar
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-sm text-[10px] uppercase tracking-widest"
                                >
                                    {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                                    Guardar
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {value}
                        </p>
                        {updatedAt && (
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                Última edición: {format(new Date(updatedAt), "PPP p", { locale: es })}
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
