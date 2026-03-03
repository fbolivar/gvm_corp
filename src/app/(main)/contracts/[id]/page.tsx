import { createClient } from '@/lib/supabase/server';
import { contractService, CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, CONTRACT_TYPE_COLORS, daysUntilExpiry } from '@/features/contracts/services/contractService';
import { ContractDetailClient } from './client';
import { redirect } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [contract, amendments] = await Promise.all([
        contractService.getById(supabase, id),
        contractService.getAmendments(supabase, id),
    ]);

    const party = contract.party as { legal_name: string; nit: string } | null;
    const days = daysUntilExpiry(contract);

    return (
        <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-5">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                        <FileText className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">{contract.title}</h1>
                            {contract.contract_number && (
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{contract.contract_number}</span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${CONTRACT_STATUS_COLORS[contract.status]}`}>
                                {CONTRACT_STATUS_LABELS[contract.status]}
                            </Badge>
                            <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${CONTRACT_TYPE_COLORS[contract.contract_type]}`}>
                                {CONTRACT_TYPE_LABELS[contract.contract_type]}
                            </Badge>
                            {days !== null && days >= 0 && days <= 30 && (
                                <Badge className="border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 bg-amber-100 text-amber-700">
                                    Vence en {days}d
                                </Badge>
                            )}
                            {days !== null && days < 0 && (
                                <Badge className="border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 bg-rose-100 text-rose-700">
                                    Vencido hace {Math.abs(days)}d
                                </Badge>
                            )}
                        </div>
                        {party && (
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{party.legal_name} · NIT {party.nit}</p>
                        )}
                    </div>
                </div>
                <Button variant="outline" className="h-12 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shrink-0" asChild>
                    <Link href="/contracts"><ArrowLeft className="h-4 w-4 mr-2" />Contratos</Link>
                </Button>
            </div>

            {/* Detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigencia</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold">Inicio</span>
                            <span className="font-black text-slate-900">{contract.start_date}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold">Vencimiento</span>
                            <span className="font-black text-slate-900">{contract.end_date ?? '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold">Auto-renovable</span>
                            <span className="font-black text-slate-900">{contract.auto_renew ? 'Sí' : 'No'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</h3>
                    <p className="text-2xl font-black text-slate-900">
                        ${Number(contract.value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{contract.currency}</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firma</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold">Firmado por</span>
                            <span className="font-black text-slate-900">{contract.signed_by ?? '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold">Fecha firma</span>
                            <span className="font-black text-slate-900">{contract.signed_at ?? '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            {contract.description && (
                <div className="bg-white rounded-[2.5rem] p-10 shadow-premium">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Objeto del Contrato</h3>
                    <p className="text-sm text-slate-700 font-semibold leading-relaxed">{contract.description}</p>
                </div>
            )}

            {/* Interactive: status changes + amendments */}
            <ContractDetailClient contract={contract} initialAmendments={amendments} />
        </div>
    );
}
