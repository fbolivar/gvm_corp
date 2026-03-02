'use client';

import { useState } from 'react';
import { Contract, ContractAmendment, ContractStatus, CONTRACT_STATUS_LABELS } from '@/features/contracts/services/contractService';
import { updateContractStatusAction, addContractAmendmentAction } from '@/features/contracts/contractActions';
import { Button } from '@/shared/components/ui/button';
import { Loader2, Plus, CheckCircle2, XCircle, PauseCircle, GitMerge } from 'lucide-react';

interface Props {
    contract: Contract;
    initialAmendments: ContractAmendment[];
}

export function ContractDetailClient({ contract: initial, initialAmendments }: Props) {
    const [contract, setContract] = useState<Contract>(initial);
    const [amendments, setAmendments] = useState<ContractAmendment[]>(initialAmendments);
    const [loading, setLoading] = useState<string | null>(null);
    const [showAmendForm, setShowAmendForm] = useState(false);
    const [amendForm, setAmendForm] = useState({ description: '', effective_date: '', value_change: 0 });
    const [amendError, setAmendError] = useState('');

    const handleStatus = async (status: ContractStatus) => {
        setLoading('status');
        const result = await updateContractStatusAction(contract.id, status);
        setLoading(null);
        if (result.error) alert(result.error);
        else setContract(c => ({ ...c, status }));
    };

    const handleAddAmendment = async () => {
        if (!amendForm.description.trim()) { setAmendError('La descripción es obligatoria'); return; }
        if (!amendForm.effective_date) { setAmendError('La fecha de vigencia es obligatoria'); return; }
        setLoading('amend');
        setAmendError('');
        const result = await addContractAmendmentAction(contract.id, amendForm);
        setLoading(null);
        if (result.error) {
            setAmendError(result.error);
        } else {
            // Refresh amendments from server (optimistic: reload)
            window.location.reload();
        }
    };

    const statusActions: { status: ContractStatus; label: string; icon: React.ElementType; className: string }[] = [
        ...(contract.status === 'DRAFT' ? [{ status: 'ACTIVE' as ContractStatus, label: 'Activar', icon: CheckCircle2, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' }] : []),
        ...(contract.status === 'ACTIVE' ? [
            { status: 'SUSPENDED' as ContractStatus, label: 'Suspender', icon: PauseCircle, className: 'bg-amber-500 hover:bg-amber-600 text-white' },
            { status: 'TERMINATED' as ContractStatus, label: 'Terminar', icon: XCircle, className: 'bg-rose-600 hover:bg-rose-700 text-white' },
        ] : []),
        ...(contract.status === 'SUSPENDED' ? [
            { status: 'ACTIVE' as ContractStatus, label: 'Reactivar', icon: CheckCircle2, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
            { status: 'TERMINATED' as ContractStatus, label: 'Terminar', icon: XCircle, className: 'bg-rose-600 hover:bg-rose-700 text-white' },
        ] : []),
    ];

    const INPUT_CLASS = 'w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all';
    const LABEL_CLASS = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

    return (
        <div className="space-y-8">
            {/* Status Actions */}
            {statusActions.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Cambiar Estado</h3>
                    <div className="flex flex-wrap gap-3">
                        {statusActions.map(action => (
                            <Button
                                key={action.status}
                                onClick={() => handleStatus(action.status)}
                                disabled={!!loading}
                                className={`h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-active ${action.className}`}
                            >
                                {loading === 'status' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <><action.icon className="h-4 w-4 mr-1.5" />{action.label} ({CONTRACT_STATUS_LABELS[action.status]})</>
                                )}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Amendments */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-premium space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tight flex items-center gap-3">
                        <GitMerge className="h-5 w-5 text-violet-500" />
                        Otrosíes / Modificaciones
                    </h3>
                    <Button
                        onClick={() => setShowAmendForm(v => !v)}
                        className="h-10 px-5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest"
                    >
                        <Plus className="h-4 w-4 mr-1.5" />Agregar
                    </Button>
                </div>

                {showAmendForm && (
                    <div className="p-6 bg-violet-50/50 rounded-2xl border border-violet-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={LABEL_CLASS}>Descripción del Otrosí *</label>
                                <textarea
                                    className={`${INPUT_CLASS} h-20 py-3 resize-none`}
                                    placeholder="Describe la modificación al contrato..."
                                    value={amendForm.description}
                                    onChange={e => setAmendForm(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Fecha de Vigencia *</label>
                                <input type="date" className={INPUT_CLASS} value={amendForm.effective_date} onChange={e => setAmendForm(p => ({ ...p, effective_date: e.target.value }))} />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Variación de Valor (COP)</label>
                                <input type="number" step="1000" className={`${INPUT_CLASS} text-right`} value={amendForm.value_change || ''} onChange={e => setAmendForm(p => ({ ...p, value_change: Number(e.target.value) }))} placeholder="0" />
                            </div>
                        </div>
                        {amendError && <p className="text-rose-600 text-sm font-semibold">{amendError}</p>}
                        <div className="flex gap-3">
                            <Button onClick={handleAddAmendment} disabled={loading === 'amend'} className="h-10 px-6 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest">
                                {loading === 'amend' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Otrosí'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowAmendForm(false)} className="h-10 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest">
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}

                {amendments.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin modificaciones registradas</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {amendments.map(a => (
                            <div key={a.id} className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50/60 border border-slate-100">
                                <div className="h-9 w-9 rounded-xl bg-violet-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                                    {a.amendment_number}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-black text-slate-900 italic">{a.description}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Vigente: {a.effective_date}
                                        {a.value_change !== 0 && ` · ${a.value_change > 0 ? '+' : ''}$${Number(a.value_change).toLocaleString('es-CO')}`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
