'use client';

import { useState } from 'react';
import { FiscalPeriod, PeriodCloseItem, CHECKLIST_ITEMS, periodLabel } from '@/features/accounting/services/fiscalPeriodService';
import { PeriodClosePanel } from '@/features/accounting/components/PeriodClosePanel';
import { createFiscalPeriodAction } from '@/features/accounting/fiscalPeriodActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, CalendarRange, Loader2, ChevronRight } from 'lucide-react';

interface PeriodWithItems {
    period: FiscalPeriod;
    items: PeriodCloseItem[];
}

interface Props {
    periods: PeriodWithItems[];
}

const STATUS_MAP = {
    OPEN:    { label: 'Abierto',   color: 'bg-emerald-100 text-emerald-700' },
    CLOSING: { label: 'En Cierre', color: 'bg-amber-100 text-amber-700' },
    CLOSED:  { label: 'Cerrado',   color: 'bg-rose-100 text-rose-700' },
};

export function PeriodCloseClient({ periods: initialPeriods }: Props) {
    const [periods, setPeriods] = useState<PeriodWithItems[]>(initialPeriods);
    const [selected, setSelected] = useState<PeriodWithItems | null>(
        initialPeriods.find(p => p.period.status !== 'CLOSED') ?? initialPeriods[0] ?? null
    );
    const [showNewForm, setShowNewForm] = useState(false);
    const [newPeriod, setNewPeriod] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const handleCreate = async () => {
        if (!newPeriod.match(/^\d{4}-\d{2}$/)) { setCreateError('Formato inválido. Use YYYY-MM'); return; }
        if (periods.some(p => p.period.period === newPeriod)) { setCreateError('Este período ya existe'); return; }
        setCreating(true);
        setCreateError('');
        const result = await createFiscalPeriodAction(newPeriod);
        setCreating(false);
        if (result.error) {
            setCreateError(result.error);
        } else {
            // Create local representation with seeded items
            const newEntry: PeriodWithItems = {
                period: {
                    id: result.id!,
                    tenant_id: '',
                    period: newPeriod,
                    status: 'OPEN',
                    closed_by: null,
                    closed_at: null,
                    notes: null,
                    created_at: new Date().toISOString(),
                },
                items: CHECKLIST_ITEMS.map((c, idx) => ({
                    id: `${result.id}-${idx}`,
                    period_id: result.id!,
                    item_key: c.key,
                    is_confirmed: false,
                    confirmed_at: null,
                    confirmed_by: null,
                    tenant_id: '',
                })),
            };
            const updated = [newEntry, ...periods];
            setPeriods(updated);
            setSelected(newEntry);
            setShowNewForm(false);
            setNewPeriod('');
        }
    };

    // Default month: current
    const defaultMonth = new Date().toISOString().slice(0, 7);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar: period list */}
            <aside className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Períodos Fiscales</h3>
                        <Button
                            onClick={() => { setShowNewForm(p => !p); setNewPeriod(defaultMonth); }}
                            variant="outline"
                            className="h-10 w-10 rounded-xl border-slate-200 text-indigo-600 hover:bg-indigo-50"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {showNewForm && (
                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nuevo Período (YYYY-MM)</p>
                            <input
                                type="month"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newPeriod}
                                onChange={e => setNewPeriod(e.target.value)}
                            />
                            {createError && <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{createError}</p>}
                            <div className="flex gap-2">
                                <Button onClick={handleCreate} disabled={creating} className="flex-1 h-9 rounded-xl bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest">
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                                </Button>
                                <Button onClick={() => setShowNewForm(false)} variant="outline" className="h-9 px-4 rounded-xl border-slate-200 font-black text-[9px] uppercase tracking-widest">
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}

                    {periods.length === 0 ? (
                        <div className="py-10 text-center">
                            <CalendarRange className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sin períodos aún</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {periods.map(pw => {
                                const confirmed = pw.items.filter(i => i.is_confirmed).length;
                                const total     = CHECKLIST_ITEMS.length;
                                const isSelected = selected?.period.id === pw.period.id;
                                const si = STATUS_MAP[pw.period.status];

                                return (
                                    <button
                                        key={pw.period.id}
                                        onClick={() => setSelected(pw)}
                                        className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all text-left ${
                                            isSelected
                                                ? 'bg-slate-900 border-slate-900 text-white'
                                                : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-white'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <p className={`text-sm font-black italic tracking-tight capitalize ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                                {periodLabel(pw.period.period)}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Badge className={`border-none text-[7px] font-black uppercase tracking-widest rounded-full px-2 py-0 ${isSelected ? 'bg-white/20 text-white' : si.color}`}>
                                                    {si.label}
                                                </Badge>
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                                                    {confirmed}/{total}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-slate-400' : 'text-slate-300'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main panel */}
            <main className="lg:col-span-8">
                {selected ? (
                    <PeriodClosePanel period={selected.period} items={selected.items} />
                ) : (
                    <div className="py-32 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                        <CalendarRange className="h-16 w-16 text-slate-200" />
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Seleccione un Período</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">O cree un nuevo período fiscal para iniciar el proceso de cierre</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
