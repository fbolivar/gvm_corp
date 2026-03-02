'use client';

import { OvertimeRequest, OvertimeStatus } from '../types';
import { OvertimeRequestForm } from './OvertimeRequestForm';
import { Clock, CheckCircle2, XCircle, HourglassIcon } from 'lucide-react';

interface Props {
    employeeId: string;
    salary: number;
    tenantId: string;
    requests: OvertimeRequest[];
}

const STATUS_CONFIG: Record<OvertimeStatus, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: {
        label: 'Pendiente',
        color: 'bg-amber-50 text-amber-700 border-amber-100',
        icon: <HourglassIcon className="h-3 w-3" />,
    },
    APPROVED: {
        label: 'Aprobada',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
        label: 'Rechazada',
        color: 'bg-rose-50 text-rose-700 border-rose-100',
        icon: <XCircle className="h-3 w-3" />,
    },
};

export function OvertimePanel({ employeeId, salary, tenantId, requests }: Props) {
    return (
        <div className="space-y-8">
            {/* Form */}
            <OvertimeRequestForm employeeId={employeeId} salary={salary} />

            {/* History */}
            {requests.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mis Solicitudes Recientes</h4>
                    </div>

                    <div className="space-y-3">
                        {requests.map((req) => {
                            const cfg = STATUS_CONFIG[req.status];
                            return (
                                <div key={req.id} className="bg-slate-50 rounded-[1.5rem] p-5 space-y-3 border border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black text-slate-800 italic tracking-tight">
                                            {req.date}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.color}`}>
                                            {cfg.icon}
                                            {cfg.label}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{req.reason}</p>
                                        <div className="shrink-0 ml-4 text-right">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Horas</span>
                                            <span className="text-lg font-black text-amber-600 italic leading-none">{req.hours}h</span>
                                        </div>
                                    </div>

                                    {req.reviewer_notes && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nota del aprobador</p>
                                            <p className="text-xs text-slate-600 italic">{req.reviewer_notes}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
