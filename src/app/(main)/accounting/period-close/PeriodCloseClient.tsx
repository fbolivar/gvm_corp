'use client';

import { useState } from 'react';
import { FiscalPeriod, PeriodCloseItem, CHECKLIST_ITEMS, periodLabel } from '@/features/accounting/services/fiscalPeriodService';
import { PeriodClosePanel } from '@/features/accounting/components/PeriodClosePanel';
import { createFiscalPeriodAction } from '@/features/accounting/fiscalPeriodActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Plus, CalendarRange, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface PeriodWithItems {
    period: FiscalPeriod;
    items: PeriodCloseItem[];
}

interface Props {
    periods: PeriodWithItems[];
}

const STATUS_MAP = {
    OPEN:    { label: 'Abierto',   color: 'bg-emerald-50 text-emerald-600' },
    CLOSING: { label: 'En Cierre', color: 'bg-amber-50 text-amber-600' },
    CLOSED:  { label: 'Cerrado',   color: 'bg-rose-50 text-rose-600' },
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

    const defaultMonth = new Date().toISOString().slice(0, 7);

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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar: period list */}
            <aside className="lg:col-span-4">
                <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-900">Períodos Fiscales</CardTitle>
                            <Button
                                onClick={() => { setShowNewForm(p => !p); setNewPeriod(defaultMonth); }}
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {showNewForm && (
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nuevo Período (YYYY-MM)</p>
                                <Input
                                    type="month"
                                    className="h-9 rounded-xl text-sm"
                                    value={newPeriod}
                                    onChange={e => setNewPeriod(e.target.value)}
                                />
                                {createError && <p className="text-[10px] text-rose-600 font-medium">{createError}</p>}
                                <div className="flex gap-2">
                                    <Button onClick={handleCreate} disabled={creating} size="sm" className="flex-1 h-8 rounded-lg bg-indigo-600 text-white text-xs">
                                        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Crear'}
                                    </Button>
                                    <Button onClick={() => setShowNewForm(false)} variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs">
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}

                        {periods.length === 0 ? (
                            <div className="py-10 text-center">
                                <CalendarRange className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs text-slate-400">Sin períodos aún</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {periods.map(pw => {
                                    const confirmed = pw.items.filter(i => i.is_confirmed).length;
                                    const total = CHECKLIST_ITEMS.length;
                                    const isSelected = selected?.period.id === pw.period.id;
                                    const si = STATUS_MAP[pw.period.status];

                                    return (
                                        <button
                                            key={pw.period.id}
                                            onClick={() => setSelected(pw)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left",
                                                isSelected
                                                    ? "bg-slate-900 border-slate-900 text-white"
                                                    : "bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-white"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <p className={cn(
                                                    "text-sm font-bold capitalize",
                                                    isSelected ? "text-white" : "text-slate-900"
                                                )}>
                                                    {periodLabel(pw.period.period)}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={cn(
                                                        "border-none text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0",
                                                        isSelected ? "bg-white/20 text-white" : si.color
                                                    )}>
                                                        {si.label}
                                                    </Badge>
                                                    <span className={cn(
                                                        "text-[10px] font-medium",
                                                        isSelected ? "text-slate-400" : "text-slate-400"
                                                    )}>
                                                        {confirmed}/{total}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className={cn("h-4 w-4", isSelected ? "text-slate-400" : "text-slate-300")} />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </aside>

            {/* Main panel */}
            <main className="lg:col-span-8">
                {selected ? (
                    <PeriodClosePanel period={selected.period} items={selected.items} />
                ) : (
                    <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                                <CalendarRange className="h-7 w-7" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 mb-1">Seleccione un Período</h3>
                            <p className="text-xs text-slate-400">O cree un nuevo período fiscal para iniciar el cierre</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
