'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Contract,
    CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS,
    CONTRACT_STATUS_COLORS, CONTRACT_TYPE_COLORS,
    daysUntilExpiry,
} from '../services/contractService';
import { updateContractStatusAction } from '../contractActions';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { FileText, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Props { initialContracts: Contract[] }

export function ContractList({ initialContracts }: Props) {
    const [contracts, setContracts] = useState<Contract[]>(initialContracts);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleStatus = async (id: string, status: 'ACTIVE' | 'TERMINATED' | 'SUSPENDED') => {
        setProcessingId(id);
        const result = await updateContractStatusAction(id, status);
        setProcessingId(null);
        if (result.error) {
            alert(result.error);
        } else {
            setContracts(prev => prev.map(c => c.id === id ? { ...c, status } : c));
        }
    };

    if (contracts.length === 0) {
        return (
            <div className="py-32 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-white shadow-sm border border-slate-50 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-slate-200" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin Contratos</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Registra tu primer contrato para centralizar la gestión</p>
                </div>
                <Button className="bg-slate-900 hover:bg-violet-600 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                    <Link href="/contracts/new">Nuevo Contrato</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {contracts.map(contract => {
                const days = daysUntilExpiry(contract);
                const isExpiringSoon = days !== null && days >= 0 && days <= 30;
                const isExpired = days !== null && days < 0;
                const isProcessing = processingId === contract.id;
                const party = contract.party as { legal_name: string } | null;

                return (
                    <div key={contract.id} className="group bg-white rounded-[2.5rem] p-8 shadow-premium border border-transparent hover:border-slate-100 hover:shadow-active transition-all duration-500">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* Icon + Info */}
                            <div className="flex items-start gap-6 flex-1 min-w-0">
                                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-violet-600 group-hover:text-white transition-all duration-500">
                                    <FileText className="h-7 w-7" />
                                </div>
                                <div className="space-y-2 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-lg font-black text-slate-900 italic tracking-tighter">{contract.title}</h3>
                                        {contract.contract_number && (
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{contract.contract_number}</span>
                                        )}
                                        <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${CONTRACT_STATUS_COLORS[contract.status]}`}>
                                            {CONTRACT_STATUS_LABELS[contract.status]}
                                        </Badge>
                                        <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${CONTRACT_TYPE_COLORS[contract.contract_type]}`}>
                                            {CONTRACT_TYPE_LABELS[contract.contract_type]}
                                        </Badge>
                                    </div>

                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {party ? party.legal_name : 'Sin tercero'}
                                        {contract.signed_by && ` · Firmado por: ${contract.signed_by}`}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Inicio: {contract.start_date}</span>
                                        {contract.end_date && (
                                            <span className={isExpired ? 'text-rose-500' : isExpiringSoon ? 'text-amber-500' : 'text-slate-400'}>
                                                Vence: {contract.end_date}
                                                {isExpiringSoon && !isExpired && ` · ${days}d restantes`}
                                                {isExpired && ' · VENCIDO'}
                                            </span>
                                        )}
                                        {contract.auto_renew && <span className="text-emerald-600">Auto-renovable</span>}
                                    </div>

                                    {(isExpiringSoon || isExpired) && (
                                        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${isExpired ? 'text-rose-500' : 'text-amber-500'}`}>
                                            <AlertTriangle className="h-3 w-3" />
                                            {isExpired ? 'Contrato vencido — requiere acción' : `Vence en ${days} días — gestionar renovación`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Value + Actions */}
                            <div className="flex flex-wrap items-center gap-4 shrink-0">
                                <div className="text-right space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</p>
                                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">
                                        ${Number(contract.value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{contract.currency}</p>
                                </div>

                                {contract.status === 'DRAFT' && (
                                    <Button
                                        onClick={() => handleStatus(contract.id, 'ACTIVE')}
                                        disabled={isProcessing}
                                        className="h-12 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active"
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Activar</>}
                                    </Button>
                                )}
                                {contract.status === 'ACTIVE' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => { if (confirm('¿Terminar este contrato?')) handleStatus(contract.id, 'TERMINATED'); }}
                                        disabled={isProcessing}
                                        className="h-12 px-5 rounded-2xl border-slate-100 text-rose-400 hover:bg-rose-50 hover:border-rose-200 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1.5" />Terminar</>}
                                    </Button>
                                )}

                                <Link
                                    href={`/contracts/${contract.id}`}
                                    className="h-12 w-12 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
