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
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mis Solicitudes Recientes</h4>
                    </div>

                    <div className="space-y-3">
                        {requests.map((req) => {
                            const cfg = STATUS_CONFIG[req.status];
                            return (
                                <div key={req.id} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-800 tracking-tight">
                                            {req.date}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${cfg.color}`}>
                                            {cfg.icon}
                                            {cfg.label}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{req.reason}</p>
                                        <div className="shrink-0 ml-4 text-right">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Horas</span>
                                            <span className="text-base font-bold text-amber-600 leading-none">{req.hours}h</span>
                                        </div>
                                    </div>

                                    {req.reviewer_notes && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Nota del aprobador</p>
                                            <p className="text-xs text-slate-600">{req.reviewer_notes}</p>
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
