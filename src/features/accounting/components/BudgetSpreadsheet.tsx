'use client';

import { useState, useCallback } from 'react';
import {
    Budget, BudgetLine, MONTH_KEYS, MONTH_LABELS, BUDGET_CATEGORIES,
    lineTotal, ActualsMap, MonthKey,
} from '../services/budgetService';
import { upsertBudgetLineAction, updateBudgetStatusAction } from '../budgetActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { CheckCircle, Lock, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useConfirm } from '@/shared/hooks/useConfirm';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT:    { label: 'Borrador',  color: 'bg-slate-50 text-slate-600' },
    APPROVED: { label: 'Aprobado',  color: 'bg-emerald-50 text-emerald-600' },
    CLOSED:   { label: 'Cerrado',   color: 'bg-rose-50 text-rose-600' },
};

interface Props {
    budget: Budget;
    lines: BudgetLine[];
    actuals: ActualsMap;
}

function fmtCOP(n: number) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function VarianceBadge({ budget, actual }: { budget: number; actual: number }) {
    const variance = actual - budget;
    const pct = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;
    if (Math.abs(variance) < 1) return <span className="text-slate-300 text-[9px]">—</span>;
    const positive = variance > 0;
    return (
        <span className={cn("flex items-center gap-0.5 text-[9px] font-bold", positive ? 'text-emerald-600' : 'text-rose-500')}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
        </span>
    );
}

function getActualForCategory(actuals: ActualsMap, category: string, monthIdx: number): number {
    const m = String(monthIdx + 1).padStart(2, '0');
    switch (category) {
        case 'INGRESOS':     return actuals.INGRESOS[m]     ?? 0;
        case 'NOMINA':       return actuals.NOMINA[m]       ?? 0;
        case 'COSTO_VENTAS': return actuals.COSTO_VENTAS[m] ?? 0;
        case 'GASTOS_ADMIN':
        case 'GASTOS_VENTAS':return actuals.GASTOS[m]       ?? 0;
        default:             return 0;
    }
}

export function BudgetSpreadsheet({ budget: initialBudget, lines: initialLines, actuals }: Props) {
    const [budget, setBudget] = useState<Budget>(initialBudget);
    const [lines, setLines]   = useState<BudgetLine[]>(initialLines);
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue]     = useState('');
    const [saving, setSaving]           = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [ConfirmDialogEl, confirmFn] = useConfirm();

    const isEditable = budget.status === 'DRAFT';

    const handleCellClick = (line: BudgetLine, month: MonthKey) => {
        if (!isEditable) return;
        setEditingCell(`${line.id}-${month}`);
        setEditValue(String(Number(line[month]) || ''));
    };

    const handleCellBlur = useCallback(async (line: BudgetLine, month: MonthKey) => {
        const numVal = parseFloat(editValue) || 0;
        setEditingCell(null);
        if (Number(line[month]) === numVal) return;
        setSaving(true);
        setLines(prev => prev.map(l => l.id === line.id ? { ...l, [month]: numVal } : l));
        await upsertBudgetLineAction(line.id, month, numVal);
        setSaving(false);
    }, [editValue]);

    const handleStatusChange = async (newStatus: Budget['status']) => {
        if (newStatus === 'APPROVED') {
            const ok = await confirmFn({ title: "Confirmar accion", description: '¿Aprobar el presupuesto? No podrá modificar los valores.', variant: "danger", confirmLabel: "Confirmar" })
            if (!ok) return;
        }
        if (newStatus === 'CLOSED') {
            const ok = await confirmFn({ title: "Confirmar accion", description: '¿Cerrar definitivamente el presupuesto?', variant: "danger", confirmLabel: "Confirmar" })
            if (!ok) return;
        }
        setStatusLoading(true);
        const result = await updateBudgetStatusAction(budget.id, newStatus);
        setStatusLoading(false);
        if (result.error) alert(result.error);
        else setBudget(p => ({ ...p, status: newStatus }));
    };

    const totalBudgetIngresos = lines.filter(l => l.category === 'INGRESOS').reduce((s, l) => s + lineTotal(l), 0);
    const totalActualIngresos = MONTH_KEYS.reduce((s, _, i) => s + getActualForCategory(actuals, 'INGRESOS', i), 0);
    const totalBudgetGastos   = lines.filter(l => l.category !== 'INGRESOS').reduce((s, l) => s + lineTotal(l), 0);
    const totalActualGastos   = MONTH_KEYS.reduce((s, _, i) =>
        s + getActualForCategory(actuals, 'GASTOS_ADMIN', i) + getActualForCategory(actuals, 'NOMINA', i), 0);

    const si = STATUS_MAP[budget.status];

    return (<>
        <div className="space-y-6">
            {/* Header strip */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-bold text-slate-900">{budget.name}</h2>
                                <Badge className={cn(
                                    "border-none text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
                                    si.color
                                )}>{si.label}</Badge>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Año fiscal {budget.year} · {saving ? 'Guardando...' : 'Guardado automáticamente'}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {budget.status === 'DRAFT' && (
                                <Button onClick={() => handleStatusChange('APPROVED')} disabled={statusLoading} size="sm" className="h-9 px-4 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-xs">
                                    {statusLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle className="h-3.5 w-3.5" />Aprobar</>}
                                </Button>
                            )}
                            {budget.status === 'APPROVED' && (
                                <Button onClick={() => handleStatusChange('CLOSED')} disabled={statusLoading} variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 text-xs">
                                    {statusLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Lock className="h-3.5 w-3.5" />Cerrar</>}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* KPI summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                        {[
                            { label: 'Ingresos Presupuestados', value: fmtCOP(totalBudgetIngresos), color: 'text-emerald-600' },
                            { label: 'Ingresos Reales',         value: fmtCOP(totalActualIngresos), color: 'text-emerald-700' },
                            { label: 'Gastos Presupuestados',   value: fmtCOP(totalBudgetGastos),   color: 'text-rose-500' },
                            { label: 'Gastos Reales',           value: fmtCOP(totalActualGastos),   color: 'text-rose-600' },
                        ].map((k, i) => (
                            <div key={i} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k.label}</p>
                                <p className={cn("text-lg font-bold font-mono tabular-nums", k.color)}>{k.value}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Spreadsheet by category */}
            {BUDGET_CATEGORIES.map(cat => {
                const catLines = lines.filter(l => l.category === cat.key);
                if (catLines.length === 0) return null;

                return (
                    <Card key={cat.key} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        {/* Category header */}
                        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                            <span className={cn("text-xs font-bold uppercase tracking-wider", cat.color)}>{cat.label}</span>
                        </div>

                        {/* Scrollable table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-48 sticky left-0 bg-white">Cuenta / Concepto</th>
                                        {MONTH_LABELS.map((m, i) => (
                                            <th key={i} className="px-2.5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right min-w-[85px]">{m}</th>
                                        ))}
                                        <th className="px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right min-w-[80px]">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catLines.map(line => (
                                        <>
                                            {/* Budget row */}
                                            <tr key={line.id + '-b'} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="px-5 py-2 sticky left-0 bg-white">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate max-w-[160px]">{line.account_name}</p>
                                                    <p className="text-[9px] text-slate-300 uppercase tracking-wider">Presup.</p>
                                                </td>
                                                {MONTH_KEYS.map((mk) => {
                                                    const cellKey = `${line.id}-${mk}`;
                                                    const isEditing = editingCell === cellKey;
                                                    return (
                                                        <td key={mk} className="px-2 py-1.5 text-right">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    autoFocus
                                                                    className="w-20 h-7 px-2 text-right text-[10px] font-medium rounded-lg border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-indigo-50"
                                                                    value={editValue}
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    onBlur={() => handleCellBlur(line, mk)}
                                                                    onKeyDown={e => e.key === 'Enter' && handleCellBlur(line, mk)}
                                                                />
                                                            ) : (
                                                                <span
                                                                    onClick={() => handleCellClick(line, mk)}
                                                                    className={cn(
                                                                        "inline-block text-[10px] font-medium font-mono",
                                                                        isEditable && 'cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 rounded px-1 py-0.5',
                                                                        Number(line[mk]) > 0 ? 'text-slate-700' : 'text-slate-300'
                                                                    )}
                                                                >
                                                                    {Number(line[mk]) > 0 ? fmtCOP(Number(line[mk])) : '—'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-2 text-right">
                                                    <span className={cn("text-[10px] font-bold font-mono", cat.color)}>{fmtCOP(lineTotal(line))}</span>
                                                </td>
                                            </tr>
                                            {/* Actual row */}
                                            <tr key={line.id + '-a'} className="border-b border-slate-100">
                                                <td className="px-5 py-1.5 sticky left-0 bg-white">
                                                    <p className="text-[9px] text-slate-300 uppercase tracking-wider">Real</p>
                                                </td>
                                                {MONTH_KEYS.map((mk, i) => {
                                                    const actual  = getActualForCategory(actuals, cat.key, i);
                                                    const budgeted = Number(line[mk]);
                                                    return (
                                                        <td key={mk} className="px-2 py-1 text-right">
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <span className={cn("text-[9px] font-medium font-mono", actual > 0 ? 'text-slate-500' : 'text-slate-200')}>
                                                                    {actual > 0 ? fmtCOP(actual) : '—'}
                                                                </span>
                                                                {(budgeted > 0 || actual > 0) && (
                                                                    <VarianceBadge budget={budgeted} actual={actual} />
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-1.5 text-right">
                                                    <span className="text-[9px] font-medium text-slate-400 font-mono">
                                                        {fmtCOP(MONTH_KEYS.reduce((s, _, i) => s + getActualForCategory(actuals, cat.key, i), 0))}
                                                    </span>
                                                </td>
                                            </tr>
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            })}
        </div>
        {ConfirmDialogEl}
    </>);
}
