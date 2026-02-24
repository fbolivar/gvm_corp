"use client"

import { TicketAuditLog as AuditLogType } from "../types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    History,
    User,
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
            <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                <History className="h-8 w-8 text-slate-200 mx-auto" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin registros de auditoría</p>
            </div>
        );
    }

    const getActionInfo = (action: string) => {
        switch (action) {
            case 'CREATE':
                return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Creación' };
            case 'UPDATE_STATUS':
                return { icon: RotateCcw, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Cambio de Estado' };
            case 'GENERATE_RMA':
                return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Aritmética RMA' };
            case 'GENERATE_CREDIT_NOTE':
                return { icon: FileEdit, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Nota de Crédito' };
            default:
                return { icon: History, color: 'text-slate-500', bg: 'bg-slate-50', label: action };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Registro de Auditoría Inmutable</h3>
                <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="relative space-y-0 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-100 before:to-transparent">
                {logs.map((log, idx) => {
                    const { icon: Icon, color, bg, label } = getActionInfo(log.action);

                    return (
                        <div key={log.id} className="relative flex items-start gap-6 pb-8 group">
                            {/* Dot/Icon */}
                            <div className={cn(
                                "relative z-10 flex items-center justify-center w-10 h-10 rounded-xl shadow-sm border border-white transition-all group-hover:scale-110",
                                bg
                            )}>
                                <Icon className={cn("h-5 w-5", color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-1">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-xs font-black text-slate-900 italic">
                                        {label} <span className="text-slate-400 font-bold not-italic px-2">•</span>
                                        {log.actor?.email || "Sistema"}
                                    </p>
                                    <time className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                        {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: es })}
                                    </time>
                                </div>

                                {/* State Changes */}
                                {log.prev_state && log.new_state && (
                                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50 flex items-center gap-3">
                                        <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 text-[9px] font-black text-slate-400 line-clamp-1 max-w-[120px]">
                                            {JSON.stringify(log.prev_state).substring(0, 50)}
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                                        <div className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-600 line-clamp-1">
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
