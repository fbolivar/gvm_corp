'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
    Wallet,
    Plus,
    Receipt,
    ArrowDownCircle,
    ArrowUpCircle,
    X,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Banknote,
    TrendingDown,
    Activity,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { PettyCashFund, PettyCashTransaction, ExpenseCategory } from '../services/pettyCashService';
import {
    createPettyCashFundAction,
    addPettyCashExpenseAction,
    addPettyCashReimbursementAction,
    closePettyCashFundAction,
} from '../actions/pettyCashActions';

// ── Helpers ────────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
});

function formatCOP(value: number): string {
    return COP.format(value);
}

function formatDate(iso: string): string {
    try {
        const parts = iso.split('T')[0].split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
        return iso;
    }
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
    { value: 'TRANSPORTE', label: 'Transporte' },
    { value: 'PAPELERIA', label: 'Papeleria y Oficina' },
    { value: 'ASEO', label: 'Aseo y Limpieza' },
    { value: 'ALIMENTACION', label: 'Alimentacion' },
    { value: 'OTROS', label: 'Otros' },
];

const CATEGORY_COLORS: Record<string, string> = {
    TRANSPORTE:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
    PAPELERIA:    'bg-violet-500/15 text-violet-400 border-violet-500/25',
    ASEO:         'bg-teal-500/15 text-teal-400 border-teal-500/25',
    ALIMENTACION: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    OTROS:        'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
        ACTIVE:     { label: 'Activa',     classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
        SUSPENDED:  { label: 'Suspendida', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25',      icon: <AlertTriangle className="h-2.5 w-2.5" /> },
        CLOSED:     { label: 'Cerrada',    classes: 'bg-rose-500/15 text-rose-400 border-rose-500/25',         icon: <XCircle className="h-2.5 w-2.5" /> },
    };
    const meta = map[status] ?? map['ACTIVE'];
    return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border', meta.classes)}>
            {meta.icon}
            {meta.label}
        </span>
    );
}

// ── Transaction type badge ─────────────────────────────────────────────────────

function TxTypeBadge({ type }: { type: string }) {
    const map: Record<string, { label: string; classes: string }> = {
        OPENING:       { label: 'Apertura',   classes: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
        EXPENSE:       { label: 'Gasto',      classes: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
        REIMBURSEMENT: { label: 'Reembolso',  classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    };
    const meta = map[type] ?? map['EXPENSE'];
    return (
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border', meta.classes)}>
            {meta.label}
        </span>
    );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
    accent: 'amber' | 'emerald' | 'rose' | 'indigo';
}

function KpiCard({ label, value, subtext, icon, accent }: KpiCardProps) {
    const colorMap: Record<string, string> = {
        amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rose:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
        indigo:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    };
    const valueColorMap: Record<string, string> = {
        amber:   'text-amber-400',
        emerald: 'text-emerald-400',
        rose:    'text-rose-400',
        indigo:  'text-indigo-400',
    };

    return (
        <div className="bg-slate-950 rounded-[2rem] p-8 border border-white/5 shadow-active relative overflow-hidden group hover:border-white/10 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.04] group-hover:opacity-[0.07] group-hover:scale-110 transition-all duration-700 pointer-events-none">
                {icon}
            </div>
            <div className="relative z-10 space-y-4">
                <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.3em]', colorMap[accent])}>
                    {icon}
                    <span>{label}</span>
                </div>
                <div className="space-y-1">
                    <div className={cn('text-2xl font-black tracking-tighter leading-none', valueColorMap[accent])}>
                        {value}
                    </div>
                    {subtext && (
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            {subtext}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Balance Bar ────────────────────────────────────────────────────────────────

function BalanceBar({ current, max }: { current: number; max: number }) {
    const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const color =
        pct > 66 ? 'bg-emerald-500' :
        pct > 33 ? 'bg-amber-500' :
        'bg-rose-500';

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Disponible</span>
                <span className={pct > 66 ? 'text-emerald-400' : pct > 33 ? 'text-amber-400' : 'text-rose-400'}>
                    {pct.toFixed(0)}%
                </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-700', color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex items-center justify-between text-[8px] font-bold text-slate-500">
                <span>{formatCOP(current)}</span>
                <span>Max: {formatCOP(max)}</span>
            </div>
        </div>
    );
}

// ── Create Fund Dialog ─────────────────────────────────────────────────────────

interface CreateFundDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

function CreateFundDialog({ open, onClose, onCreated }: CreateFundDialogProps) {
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState({
        name: '',
        max_amount: '',
        opening_balance: '',
    });

    function handleChange(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const maxAmount = parseFloat(form.max_amount.replace(/\./g, '').replace(',', '.'));
        const openingBalance = parseFloat(form.opening_balance.replace(/\./g, '').replace(',', '.'));

        if (!form.name.trim() || isNaN(maxAmount) || isNaN(openingBalance)) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        if (openingBalance > maxAmount) {
            toast.error('El saldo inicial no puede superar el monto maximo');
            return;
        }

        startTransition(async () => {
            const result = await createPettyCashFundAction({
                name: form.name.trim(),
                max_amount: maxAmount,
                opening_balance: openingBalance,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Caja menor creada correctamente');
                setForm({ name: '', max_amount: '', opening_balance: '' });
                onCreated();
                onClose();
            }
        });
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-slate-950 rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-md p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-5 bg-amber-500 rounded-full" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400">
                                Nueva Caja
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            Crear Caja Menor
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                            Nombre del fondo *
                        </label>
                        <Input
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Ej: Caja Menor Bogota"
                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/50"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                            Monto maximo (COP) *
                        </label>
                        <Input
                            type="number"
                            value={form.max_amount}
                            onChange={(e) => handleChange('max_amount', e.target.value)}
                            placeholder="500000"
                            min={0}
                            step={1000}
                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/50"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                            Saldo inicial (COP) *
                        </label>
                        <Input
                            type="number"
                            value={form.opening_balance}
                            onChange={(e) => handleChange('opening_balance', e.target.value)}
                            placeholder="200000"
                            min={0}
                            step={1000}
                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/50"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-white/10 text-slate-400 hover:bg-white/5"
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px]"
                        >
                            {isPending ? 'Creando...' : 'Crear Fondo'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Add Expense Form ───────────────────────────────────────────────────────────

interface AddExpenseFormProps {
    fundId: string;
    onSuccess: () => void;
}

function AddExpenseForm({ fundId, onSuccess }: AddExpenseFormProps) {
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState({
        amount: '',
        description: '',
        receipt_number: '',
        expense_category: '' as ExpenseCategory | '',
    });

    function handleChange(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const amount = parseFloat(form.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Ingresa un monto valido');
            return;
        }
        if (!form.description.trim()) {
            toast.error('La descripcion es requerida');
            return;
        }

        startTransition(async () => {
            const result = await addPettyCashExpenseAction(fundId, {
                amount,
                description: form.description.trim(),
                receipt_number: form.receipt_number.trim() || null,
                expense_category: (form.expense_category || null) as ExpenseCategory | null,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Gasto registrado correctamente');
                setForm({ amount: '', description: '', receipt_number: '', expense_category: '' });
                onSuccess();
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <ArrowDownCircle className="h-4 w-4 text-rose-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-400">
                    Registrar Gasto
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                        Monto *
                    </label>
                    <Input
                        type="number"
                        value={form.amount}
                        onChange={(e) => handleChange('amount', e.target.value)}
                        placeholder="50000"
                        min={0}
                        step={100}
                        className="h-9 text-sm"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                        No. Comprobante
                    </label>
                    <Input
                        value={form.receipt_number}
                        onChange={(e) => handleChange('receipt_number', e.target.value)}
                        placeholder="RCP-001"
                        className="h-9 text-sm"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    Descripcion *
                </label>
                <Input
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detalle del gasto..."
                    className="h-9 text-sm"
                    required
                />
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    Categoria
                </label>
                <select
                    value={form.expense_category}
                    onChange={(e) => handleChange('expense_category', e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                >
                    <option value="">Sin categoria</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                            {cat.label}
                        </option>
                    ))}
                </select>
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest text-[9px] h-9"
            >
                {isPending ? 'Registrando...' : 'Registrar Gasto'}
            </Button>
        </form>
    );
}

// ── Reimburse Form ─────────────────────────────────────────────────────────────

interface ReimburseFormProps {
    fundId: string;
    maxAmount: number;
    currentBalance: number;
    onSuccess: () => void;
}

function ReimburseForm({ fundId, maxAmount, currentBalance, onSuccess }: ReimburseFormProps) {
    const [isPending, startTransition] = useTransition();
    const suggestedAmount = Math.max(0, maxAmount - currentBalance);
    const [amount, setAmount] = useState(String(suggestedAmount));
    const [description, setDescription] = useState('Reembolso de caja menor');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error('Ingresa un monto valido');
            return;
        }
        if (!description.trim()) {
            toast.error('La descripcion es requerida');
            return;
        }

        startTransition(async () => {
            const result = await addPettyCashReimbursementAction(fundId, {
                amount: parsedAmount,
                description: description.trim(),
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Reembolso registrado correctamente');
                onSuccess();
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">
                    Reembolsar Fondo
                </span>
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    Monto a reembolsar (COP) *
                </label>
                <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={0}
                    step={1000}
                    className="h-9 text-sm"
                    required
                />
                {suggestedAmount > 0 && (
                    <p className="text-[8px] text-slate-400 font-bold">
                        Sugerido para llenar al maximo: {formatCOP(suggestedAmount)}
                    </p>
                )}
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    Descripcion *
                </label>
                <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-9 text-sm"
                    required
                />
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] h-9"
            >
                {isPending ? 'Procesando...' : 'Confirmar Reembolso'}
            </Button>
        </form>
    );
}

// ── Transaction List ───────────────────────────────────────────────────────────

function TransactionList({ transactions }: { transactions: PettyCashTransaction[] }) {
    if (transactions.length === 0) {
        return (
            <div className="text-center py-8">
                <Receipt className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Sin movimientos registrados
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Fecha</th>
                        <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Tipo</th>
                        <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Descripcion</th>
                        <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Categoria</th>
                        <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Comprobante</th>
                        <th className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Monto</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {transactions.map((tx) => {
                        const isExpense = tx.type === 'EXPENSE';
                        const isReimbursement = tx.type === 'REIMBURSEMENT';
                        return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                        {formatDate(tx.created_at)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <TxTypeBadge type={tx.type} />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[11px] text-slate-700 font-medium">
                                        {tx.description}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {tx.expense_category ? (
                                        <span className={cn(
                                            'inline-flex items-center px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border',
                                            CATEGORY_COLORS[tx.expense_category] ?? CATEGORY_COLORS['OTROS']
                                        )}>
                                            {tx.expense_category}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300 text-[10px]">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[10px] font-mono text-slate-500">
                                        {tx.receipt_number ?? '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={cn(
                                        'text-[12px] font-black tabular-nums',
                                        isExpense       ? 'text-rose-600'    :
                                        isReimbursement ? 'text-emerald-600' :
                                        'text-indigo-600'
                                    )}>
                                        {isExpense ? '-' : '+'}
                                        {formatCOP(tx.amount)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Fund Card ──────────────────────────────────────────────────────────────────

type PanelTab = 'gastos' | 'reembolso' | 'historial';

interface FundCardProps {
    fund: PettyCashFund;
    transactions: PettyCashTransaction[];
    isExpanded: boolean;
    onToggle: () => void;
    onTransactionChange: () => void;
    onClose: () => void;
}

function FundCard({
    fund,
    transactions,
    isExpanded,
    onToggle,
    onTransactionChange,
    onClose,
}: FundCardProps) {
    const [ConfirmDialogEl, confirmFn] = useConfirm();
    const [activePanel, setActivePanel] = useState<PanelTab>('historial');
    const [isPending, startTransition] = useTransition();

    const isActive = fund.status === 'ACTIVE';

    async function handleClose() {
        const ok = await confirmFn({ title: "Confirmar", description: `Cerrar la caja menor "${fund.name}"? Esta accion no se puede deshacer.`, variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;
        startTransition(async () => {
            const result = await closePettyCashFundAction(fund.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Caja menor cerrada');
                onClose();
            }
        });
    }

    return (
        <div className={cn(
            'bg-white rounded-[2rem] border transition-all duration-500 overflow-hidden shadow-premium',
            isExpanded ? 'border-slate-200 shadow-active' : 'border-slate-100 hover:border-slate-200'
        )}>
            {/* Card Header */}
            <div
                className="p-7 cursor-pointer select-none"
                onClick={onToggle}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className={cn(
                            'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
                            isActive ? 'bg-amber-500/10' : 'bg-slate-100'
                        )}>
                            <Wallet className={cn('h-5 w-5', isActive ? 'text-amber-500' : 'text-slate-400')} />
                        </div>
                        <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight leading-none">
                                    {fund.name}
                                </h3>
                                <StatusBadge status={fund.status} />
                            </div>
                            {fund.custodian_name && (
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                    Custodio: {fund.custodian_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                            <div className="text-xl font-black text-slate-900 tabular-nums leading-none">
                                {formatCOP(fund.current_balance)}
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Saldo actual
                            </div>
                        </div>
                        {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-slate-400" />
                            : <ChevronDown className="h-4 w-4 text-slate-400" />
                        }
                    </div>
                </div>

                {/* Balance bar */}
                <div className="mt-5" onClick={(e) => e.stopPropagation()}>
                    <BalanceBar current={fund.current_balance} max={fund.max_amount} />
                </div>
            </div>

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* Tabs */}
                    <div className="flex items-center gap-1 p-5 pb-0">
                        {([
                            { id: 'historial', label: 'Historial', icon: <Receipt className="h-3 w-3" /> },
                            ...(isActive ? [
                                { id: 'gastos',    label: 'Nuevo Gasto',   icon: <ArrowDownCircle className="h-3 w-3" /> },
                                { id: 'reembolso', label: 'Reembolsar',    icon: <ArrowUpCircle className="h-3 w-3" /> },
                            ] : []),
                        ] as { id: PanelTab; label: string; icon: React.ReactNode }[]).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActivePanel(tab.id)}
                                className={cn(
                                    'h-8 px-4 rounded-xl flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all duration-200',
                                    activePanel === tab.id
                                        ? tab.id === 'gastos'
                                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                            : tab.id === 'reembolso'
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            : 'bg-slate-950 text-white'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}

                        {/* Close fund button */}
                        {isActive && (
                            <button
                                onClick={handleClose}
                                disabled={isPending}
                                className="ml-auto h-8 px-4 rounded-xl flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 border border-transparent hover:border-rose-200"
                            >
                                <X className="h-3 w-3" />
                                Cerrar Fondo
                            </button>
                        )}
                    </div>

                    {/* Panel Content */}
                    <div className="p-5">
                        {activePanel === 'historial' && (
                            <TransactionList transactions={transactions} />
                        )}
                        {activePanel === 'gastos' && isActive && (
                            <div className="max-w-md">
                                <AddExpenseForm
                                    fundId={fund.id}
                                    onSuccess={() => {
                                        onTransactionChange();
                                        setActivePanel('historial');
                                    }}
                                />
                            </div>
                        )}
                        {activePanel === 'reembolso' && isActive && (
                            <div className="max-w-md">
                                <ReimburseForm
                                    fundId={fund.id}
                                    maxAmount={fund.max_amount}
                                    currentBalance={fund.current_balance}
                                    onSuccess={() => {
                                        onTransactionChange();
                                        setActivePanel('historial');
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
            {ConfirmDialogEl}
        </div>
    );
}

// ── Main Client Component ──────────────────────────────────────────────────────

interface Props {
    funds: PettyCashFund[];
}

type TransactionCache = Record<string, PettyCashTransaction[]>;

export default function PettyCashClient({ funds: initialFunds }: Props) {
    const [funds, setFunds] = useState<PettyCashFund[]>(initialFunds);
    const [txCache, setTxCache] = useState<TransactionCache>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // ── KPI derivations ────────────────────────────────────────────────────────

    const activeFunds = funds.filter((f) => f.status === 'ACTIVE');
    const totalBalance = activeFunds.reduce((s, f) => s + Number(f.current_balance), 0);
    const highestConsumption = activeFunds.reduce<PettyCashFund | null>((acc, f) => {
        const used = Number(f.max_amount) - Number(f.current_balance);
        const accUsed = acc ? Number(acc.max_amount) - Number(acc.current_balance) : -1;
        return used > accUsed ? f : acc;
    }, null);

    // ── Expand fund and load transactions ──────────────────────────────────────

    async function handleToggle(fundId: string) {
        if (expandedId === fundId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(fundId);

        // Load transactions if not cached
        if (!txCache[fundId]) {
            try {
                const res = await fetch(`/api/petty-cash/${fundId}/transactions`);
                if (res.ok) {
                    const json = await res.json() as { transactions: PettyCashTransaction[] };
                    setTxCache((prev) => ({ ...prev, [fundId]: json.transactions }));
                }
            } catch {
                // Graceful degradation: show empty list until page reloads
                setTxCache((prev) => ({ ...prev, [fundId]: [] }));
            }
        }
    }

    // ── Refresh transactions for a fund ───────────────────────────────────────

    async function refreshTransactions(fundId: string) {
        try {
            const res = await fetch(`/api/petty-cash/${fundId}/transactions`);
            if (res.ok) {
                const json = await res.json() as { transactions: PettyCashTransaction[] };
                setTxCache((prev) => ({ ...prev, [fundId]: json.transactions }));
            }
        } catch {
            // Ignore
        }
        // Refresh fund balances via re-fetch
        await refreshFunds();
    }

    async function refreshFunds() {
        try {
            const res = await fetch('/api/petty-cash/funds');
            if (res.ok) {
                const json = await res.json() as { funds: PettyCashFund[] };
                setFunds(json.funds);
            }
        } catch {
            // Server revalidation will handle this on next navigation
        }
    }

    // ── Close fund and update local state ─────────────────────────────────────

    async function handleFundClosed() {
        await refreshFunds();
        setExpandedId(null);
    }

    // ── Created fund: optimistic reload ───────────────────────────────────────

    async function handleFundCreated() {
        await refreshFunds();
    }

    return (
        <div className="space-y-8">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <KpiCard
                    label="Fondos Activos"
                    value={String(activeFunds.length)}
                    subtext={`${funds.length} fondos en total`}
                    icon={<Wallet className="h-3.5 w-3.5" />}
                    accent="amber"
                />
                <KpiCard
                    label="Saldo Total"
                    value={formatCOP(totalBalance)}
                    subtext="Suma de cajas activas"
                    icon={<Banknote className="h-3.5 w-3.5" />}
                    accent="emerald"
                />
                <KpiCard
                    label="Mayor Consumo"
                    value={
                        highestConsumption
                            ? formatCOP(
                                Number(highestConsumption.max_amount) -
                                Number(highestConsumption.current_balance)
                            )
                            : '$0'
                    }
                    subtext={highestConsumption?.name ?? 'Sin fondos'}
                    icon={<TrendingDown className="h-3.5 w-3.5" />}
                    accent="rose"
                />
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            Fondos Registrados
                        </span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400">
                        {funds.length} {funds.length === 1 ? 'caja menor' : 'cajas menores'} encontradas
                    </p>
                </div>

                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[9px] h-10 px-5 rounded-xl gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Caja
                </Button>
            </div>

            {/* Fund Cards */}
            {funds.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-premium p-16 text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                        <Wallet className="h-8 w-8 text-slate-300" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tight">
                            Sin Cajas Menores
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Crea tu primer fondo para comenzar
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[9px] h-10 px-6 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Crear Primera Caja
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {funds.map((fund) => (
                        <FundCard
                            key={fund.id}
                            fund={fund}
                            transactions={txCache[fund.id] ?? []}
                            isExpanded={expandedId === fund.id}
                            onToggle={() => handleToggle(fund.id)}
                            onTransactionChange={() => refreshTransactions(fund.id)}
                            onClose={handleFundClosed}
                        />
                    ))}
                </div>
            )}

            {/* Create Fund Dialog */}
            <CreateFundDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreated={handleFundCreated}
            />
        </div>
    );
}
