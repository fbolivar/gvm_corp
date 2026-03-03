'use client';

import { useState, useTransition } from 'react';
import { createMaintenanceOrderAction } from '../actions';
import type { Equipment } from '../types';
import { ClipboardList, Loader2 } from 'lucide-react';

interface MaintenanceOrderFormProps {
    equipment: Equipment[];
}

const ORDER_TYPES = [
    { value: 'PREVENTIVE', label: 'Preventivo' },
    { value: 'CORRECTIVE', label: 'Correctivo' },
    { value: 'PREDICTIVE', label: 'Predictivo' },
];

const PRIORITIES = [
    { value: 'LOW',      label: 'Baja' },
    { value: 'MEDIUM',   label: 'Media' },
    { value: 'HIGH',     label: 'Alta' },
    { value: 'CRITICAL', label: 'Critica' },
];

const today = new Date().toISOString().slice(0, 10);

export function MaintenanceOrderForm({ equipment }: MaintenanceOrderFormProps) {
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
                await createMaintenanceOrderAction(fd);
                setSuccess(true);
                form.reset();
                setTimeout(() => setSuccess(false), 4000);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al crear orden');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Equipo */}
            <div className="space-y-1.5">
                <label htmlFor="mo-equipment" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Equipo <span className="text-rose-500">*</span>
                </label>
                <select
                    id="mo-equipment"
                    name="equipment_id"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                    <option value="">Selecciona un equipo…</option>
                    {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                            {eq.code} — {eq.name}{eq.location ? ` (${eq.location})` : ''}
                        </option>
                    ))}
                </select>
                {equipment.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold">
                        Sin equipos activos. Registra uno primero.
                    </p>
                )}
            </div>

            {/* Tipo y prioridad */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="mo-type" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Tipo <span className="text-rose-500">*</span>
                    </label>
                    <select
                        id="mo-type"
                        name="order_type"
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                        <option value="">Tipo…</option>
                        {ORDER_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="mo-priority" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Prioridad <span className="text-rose-500">*</span>
                    </label>
                    <select
                        id="mo-priority"
                        name="priority"
                        required
                        defaultValue="MEDIUM"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                        {PRIORITIES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Descripcion */}
            <div className="space-y-1.5">
                <label htmlFor="mo-desc" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Descripcion <span className="text-rose-500">*</span>
                </label>
                <textarea
                    id="mo-desc"
                    name="description"
                    required
                    minLength={5}
                    rows={3}
                    placeholder="Describe el trabajo a realizar…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
            </div>

            {/* Tecnico y fecha */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="mo-tech" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tecnico</label>
                    <input
                        id="mo-tech"
                        name="technician_name"
                        placeholder="Nombre del tecnico"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="mo-date" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Fecha Prog. <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="mo-date"
                        type="date"
                        name="scheduled_date"
                        required
                        defaultValue={today}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                </div>
            </div>

            {/* Costo estimado */}
            <div className="space-y-1.5">
                <label htmlFor="mo-cost" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Estimado (COP)</label>
                <input
                    id="mo-cost"
                    type="number"
                    name="estimated_cost"
                    min="0"
                    step="1000"
                    placeholder="0"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
            </div>

            {error && (
                <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</p>
            )}
            {success && (
                <p role="status" className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2">
                    Orden de mantenimiento creada exitosamente
                </p>
            )}

            <button
                type="submit"
                disabled={pending || equipment.length === 0}
                className="w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
                {pending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando Orden…</>
                    : <><ClipboardList className="h-4 w-4" /> Crear Orden de Trabajo</>
                }
            </button>
        </form>
    );
}
