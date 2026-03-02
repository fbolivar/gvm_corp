'use client';

import { useState, useCallback } from 'react';
import {
    Budget, BudgetLine, MONTH_KEYS, MONTH_LABELS, BUDGET_CATEGORIES,
    lineTotal, ActualsMap, MonthKey,
} from '../services/budgetService';
import { upsertBudgetLineAction, updateBudgetStatusAction } from '../budgetActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { CheckCircle, Lock, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STATUS_MAP = {
    DRAFT:    { label: 'Borrador',  color: 'bg-slate-100 text-slate-600' },
    APPROVED: { label: 'Aprobado',  color: 'bg-emerald-100 text-emerald-700' },
    CLOSED:   { label: 'Cerrado',   color: 'bg-rose-100 text-rose-700' },
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
    if (Math.abs(variance) < 1) return <span className="text-slate-300 text-[9px] font-black">—</span>;
    const positive = variance > 0;
    return (
        <span className={`flex items-center gap-0.5 text-[9px] font-black ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
        </span>
    );
}

// Map category → actuals key
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
    const [editingCell, setEditingCell] = useState<string | null>(null); // 'lineId-monthKey'
    const [editValue, setEditValue]     = useState('');
    const [saving, setSaving]           = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);

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
        if (newStatus === 'APPROVED' && !confirm('¿Aprobar el presupuesto? No podrá modificar los valores.')) return;
        if (newStatus === 'CLOSED'   && !confirm('¿Cerrar definitivamente el presupuesto?')) return;
        setStatusLoading(true);
        const result = await updateBudgetStatusAction(budget.id, newStatus);
        setStatusLoading(false);
        if (result.error) alert(result.error);
        else setBudget(p => ({ ...p, status: newStatus }));
    };

    // Aggregate actuals row sums for KPI bar
    const totalBudgetIngresos = lines.filter(l => l.category === 'INGRESOS').reduce((s, l) => s + lineTotal(l), 0);
    const totalActualIngresos = MONTH_KEYS.reduce((s, _, i) => s + getActualForCategory(actuals, 'INGRESOS', i), 0);
    const totalBudgetGastos   = lines.filter(l => l.category !== 'INGRESOS').reduce((s, l) => s + lineTotal(l), 0);
    const totalActualGastos   = MONTH_KEYS.reduce((s, _, i) =>
        s + getActualForCategory(actuals, 'GASTOS_ADMIN', i) + getActualForCategory(actuals, 'NOMINA', i), 0);

    const si = STATUS_MAP[budget.status];

    return (
        <div className="space-y-8">
            {/* Header strip */}
            <div className="bg-white rounded-[3rem] p-10 shadow-premium">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter">{budget.name}</h2>
                            <Badge className={`border-none text-[9px] font-black uppercase tracking-widest rounded-full px-3 ${si.color}`}>{si.label}</Badge>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Año fiscal {budget.year} · {saving ? 'Guardando...' : 'Guardado automáticamente'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {budget.status === 'DRAFT' && (
                            <Button onClick={() => handleStatusChange('APPROVED')} disabled={statusLoading} className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest">
                                {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" />Aprobar</>}
                            </Button>
                        )}
                        {budget.status === 'APPROVED' && (
                            <Button onClick={() => handleStatusChange('CLOSED')} disabled={statusLoading} variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500">
                                {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-4 w-4 mr-2" />Cerrar</>}
                            </Button>
                        )}
                    </div>
                </div>

                {/* KPI summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                        { label: 'Ingresos Presupuestados', value: fmtCOP(totalBudgetIngresos), color: 'text-emerald-600' },
                        { label: 'Ingresos Reales',         value: fmtCOP(totalActualIngresos), color: 'text-emerald-700' },
                        { label: 'Gastos Presupuestados',   value: fmtCOP(totalBudgetGastos),   color: 'text-rose-500' },
                        { label: 'Gastos Reales',           value: fmtCOP(totalActualGastos),   color: 'text-rose-600' },
                    ].map((k, i) => (
                        <div key={i} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
                            <p className={`text-2xl font-black italic tracking-tighter ${k.color}`}>{k.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spreadsheet by category */}
            {BUDGET_CATEGORIES.map(cat => {
                const catLines = lines.filter(l => l.category === cat.key);
                if (catLines.length === 0) return null;

                return (
                    <div key={cat.key} className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                        {/* Category header */}
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                            <div className={`text-sm font-black uppercase italic tracking-tight ${cat.color}`}>{cat.label}</div>
                        </div>

                        {/* Scrollable table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-48 sticky left-0 bg-white">Cuenta / Concepto</th>
                                        {MONTH_LABELS.map((m, i) => (
                                            <th key={i} className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[90px]">{m}</th>
                                        ))}
                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[80px]">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catLines.map(line => (
                                        <>
                                            {/* Budget row */}
                                            <tr key={line.id + '-b'} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="px-6 py-2.5 sticky left-0 bg-white">
                                                    <p className="text-[10px] font-black text-slate-700 truncate max-w-[160px]">{line.account_name}</p>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Presup.</p>
                                                </td>
                                                {MONTH_KEYS.map((mk, i) => {
                                                    const cellKey = `${line.id}-${mk}`;
                                                    const isEditing = editingCell === cellKey;
                                                    return (
                                                        <td key={mk} className="px-2 py-1.5 text-right">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    autoFocus
                                                                    className="w-20 h-7 px-2 text-right text-[10px] font-black rounded-lg border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-indigo-50"
                                                                    value={editValue}
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    onBlur={() => handleCellBlur(line, mk)}
                                                                    onKeyDown={e => e.key === 'Enter' && handleCellBlur(line, mk)}
                                                                />
                                                            ) : (
                                                                <span
                                                                    onClick={() => handleCellClick(line, mk)}
                                                                    className={`inline-block text-[10px] font-black ${isEditable ? 'cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 rounded px-1 py-0.5' : ''} ${Number(line[mk]) > 0 ? 'text-slate-700' : 'text-slate-300'}`}
                                                                >
                                                                    {Number(line[mk]) > 0 ? fmtCOP(Number(line[mk])) : '—'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-2.5 text-right">
                                                    <span className={`text-[10px] font-black ${cat.color}`}>{fmtCOP(lineTotal(line))}</span>
                                                </td>
                                            </tr>
                                            {/* Actual row */}
                                            <tr key={line.id + '-a'} className="border-b border-slate-100">
                                                <td className="px-6 py-2 sticky left-0 bg-white">
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Real</p>
                                                </td>
                                                {MONTH_KEYS.map((mk, i) => {
                                                    const actual  = getActualForCategory(actuals, cat.key, i);
                                                    const budgeted = Number(line[mk]);
                                                    return (
                                                        <td key={mk} className="px-2 py-1.5 text-right">
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <span className={`text-[9px] font-black ${actual > 0 ? 'text-slate-500' : 'text-slate-200'}`}>
                                                                    {actual > 0 ? fmtCOP(actual) : '—'}
                                                                </span>
                                                                {(budgeted > 0 || actual > 0) && (
                                                                    <VarianceBadge budget={budgeted} actual={actual} />
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-2 text-right">
                                                    <span className="text-[9px] font-black text-slate-400">
                                                        {fmtCOP(MONTH_KEYS.reduce((s, _, i) => s + getActualForCategory(actuals, cat.key, i), 0))}
                                                    </span>
                                                </td>
                                            </tr>
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
