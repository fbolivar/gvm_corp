'use client';

import { useState, useTransition } from 'react';
import { createEquipmentAction } from '../actions';
import { Wrench, Loader2 } from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

export function EquipmentForm() {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        startTransition(async () => {
            try {
                await createEquipmentAction(fd);
                setSuccess(true);
                form.reset();
                setTimeout(() => setSuccess(false), 4000);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al registrar equipo');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Codigo y nombre */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="eq-code" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Codigo <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="eq-code"
                        name="code"
                        required
                        placeholder="EQ-001"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="eq-name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nombre <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="eq-name"
                        name="name"
                        required
                        placeholder="Compresor industrial"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
            </div>

            {/* Marca y modelo */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="eq-brand" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                    <input
                        id="eq-brand"
                        name="brand"
                        placeholder="Atlas Copco"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="eq-model" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</label>
                    <input
                        id="eq-model"
                        name="model"
                        placeholder="GA-15"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
            </div>

            {/* Serial y ubicacion */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="eq-serial" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Serie</label>
                    <input
                        id="eq-serial"
                        name="serial_number"
                        placeholder="SN-2024-XXXXX"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="eq-location" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicacion</label>
                    <input
                        id="eq-location"
                        name="location"
                        placeholder="Bodega A - Piso 1"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="eq-purchase" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Compra</label>
                    <input
                        id="eq-purchase"
                        type="date"
                        name="purchase_date"
                        max={today}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="eq-next" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prox. Mtto.</label>
                    <input
                        id="eq-next"
                        type="date"
                        name="next_maintenance_date"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
                <label htmlFor="eq-notes" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas</label>
                <textarea
                    id="eq-notes"
                    name="notes"
                    rows={2}
                    placeholder="Observaciones del equipo…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
            </div>

            {error && (
                <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</p>
            )}
            {success && (
                <p role="status" className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2">
                    Equipo registrado exitosamente
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="w-full h-12 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
                {pending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                    : <><Wrench className="h-4 w-4" /> Registrar Equipo</>
                }
            </button>
        </form>
    );
}
