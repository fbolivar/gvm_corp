"use client"

import { TicketAuditLog as AuditLogType } from "../types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    History,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    FileEdit,
    RotateCcw
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Props {
    logs: AuditLogType[];
}

export function TicketAuditLog({ logs }: Props) {
    if (!logs || logs.length === 0) {
        return (
            <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <History className="h-6 w-6 text-slate-200 mx-auto" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sin registros de auditoria</p>
            </div>
        );
    }

    const getActionInfo = (action: string) => {
        switch (action) {
            case 'CREATE':
                return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Creacion' };
            case 'UPDATE_STATUS':
                return { icon: RotateCcw, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Cambio de Estado' };
            case 'GENERATE_RMA':
                return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'RMA Generado' };
            case 'GENERATE_CREDIT_NOTE':
                return { icon: FileEdit, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Nota de Credito' };
            default:
                return { icon: History, color: 'text-slate-500', bg: 'bg-slate-50', label: action };
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 px-1">
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Registro de Auditoria</h3>
                <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="relative space-y-0 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-100 before:to-transparent">
                {logs.map((log) => {
                    const { icon: Icon, color, bg, label } = getActionInfo(log.action);

                    return (
                        <div key={log.id} className="relative flex items-start gap-4 pb-6 group">
                            {/* Dot/Icon */}
                            <div className={cn(
                                "relative z-10 flex items-center justify-center w-8 h-8 rounded-xl shadow-sm border border-white transition-all",
                                bg
                            )}>
                                <Icon className={cn("h-4 w-4", color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-0.5">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold text-slate-900">
                                        {label} <span className="text-slate-300 font-medium px-1">·</span>
                                        <span className="font-medium text-slate-500">{log.actor?.email || "Sistema"}</span>
                                    </p>
                                    <time className="text-[10px] font-medium text-slate-300 uppercase tracking-wider shrink-0">
                                        {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: es })}
                                    </time>
                                </div>

                                {/* State Changes */}
                                {log.prev_state && log.new_state && (
                                    <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-100/50 flex items-center gap-2">
                                        <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 text-[10px] font-bold text-slate-400 line-clamp-1 max-w-[120px]">
                                            {JSON.stringify(log.prev_state).substring(0, 50)}
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                                        <div className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-600 line-clamp-1">
                                            {JSON.stringify(log.new_state).substring(0, 50)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
