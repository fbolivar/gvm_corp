"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared/components/ui/button";
import {
    Activity,
    User,
    Clock,
    FileText,
    LayoutList,
    LogIn,
    Settings,
    UserCog,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    Database
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";

interface AuditLog {
    id: string;
    actor_email: string;
    action: string;
    entity: string;
    entity_id: string;
    payload: any;
    created_at: string;
}

interface Props {
    logs: AuditLog[];
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    LOGIN: { label: "Inicio de Sesión", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: LogIn },
    UPDATE_PROFILE: { label: "Perfil Actualizado", color: "text-blue-600 bg-blue-50 border-blue-100", icon: UserCog },
    UPDATE_SETTINGS: { label: "Ajustes Modificados", color: "text-violet-600 bg-violet-50 border-violet-100", icon: Settings },
    CREATE: { label: "Creación", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: Database },
    UPDATE: { label: "Actualización", color: "text-amber-600 bg-amber-50 border-amber-100", icon: FileText },
    DELETE: { label: "Eliminación", color: "text-rose-600 bg-rose-50 border-rose-100", icon: ShieldAlert },
};

function LogItem({ log }: { log: AuditLog }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Determine config based on action or fallback
    const config = Object.entries(ACTION_CONFIG).find(([key]) => log.action?.includes(key))?.[1] ||
        { label: log.action, color: "text-slate-600 bg-slate-50 border-slate-200", icon: Activity };

    const Icon = config.icon;

    return (
        <div className="group border-b border-slate-50 last:border-0">
            <div
                className={cn(
                    "p-5 md:p-6 flex items-start md:items-center gap-4 hover:bg-slate-50/80 transition-all cursor-pointer",
                    isExpanded && "bg-slate-50"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Icon Box */}
                <div className={cn(
                    "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105",
                    config.color
                )}>
                    <Icon className="h-5 w-5" />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 flex flex-col md:grid md:grid-cols-3 gap-4 items-start md:items-center">
                    <div className="md:col-span-2 w-full">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm italic">{config.label}</h4>
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 py-0 font-black text-slate-400 bg-white border-slate-200 rounded-full uppercase tracking-tighter">
                                {log.entity}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 overflow-hidden">
                            <span className="flex items-center gap-1 font-bold text-slate-600 shrink-0">
                                <User className="h-3 w-3" />
                                {log.actor_email?.split('@')[0] || "Sistema"}
                            </span>
                            <span className="text-slate-300 shrink-0">•</span>
                            <span className="truncate font-medium">
                                {log.actor_email}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-premium-sm text-[10px] font-black uppercase tracking-tight">
                            <Clock className="h-3 w-3 text-slate-300" />
                            {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: es })}
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform text-slate-300 shrink-0", isExpanded && "rotate-180")} />
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-6 md:px-20 pb-6 pt-0 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-white rounded-[1.5rem] md:rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 px-4 bg-slate-50 rounded-bl-2xl border-b border-l border-slate-100">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payload Data</span>
                        </div>
                        <pre className="text-[10px] font-mono text-slate-500 overflow-x-auto leading-relaxed pt-4">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AuditLogList({ logs }: Props) {
    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">Registro de Actividad</h2>
                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1 uppercase">Audit Log de Seguridad y Cambios</p>
            </div>

            <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-0 border-b border-slate-50/50 bg-white z-10 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 italic">
                            <Activity className="h-6 w-6 text-rose-500" />
                            Línea de Tiempo
                        </CardTitle>
                        <Badge className="font-black text-[9px] md:text-[10px] rounded-full px-4 py-1.5 bg-slate-900 text-white border-none shadow-lg shadow-slate-200 w-fit">
                            {logs.length} EVENTOS REGISTRADOS
                        </Badge>
                    </div>
                    {/* Header Row for large screens */}
                    <div className="hidden md:grid grid-cols-3 gap-4 pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="col-span-2 pl-12">Evento & Usuario</div>
                        <div className="text-right pr-8">Fecha & Hora</div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    <ScrollArea className="h-[600px] w-full pr-0">
                        <div className="pb-0">
                            {logs.map((log) => (
                                <LogItem key={log.id} log={log} />
                            ))}

                            {logs.length === 0 && (
                                <div className="p-20 text-center flex flex-col items-center justify-center opacity-50">
                                    <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                        <LayoutList className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <p className="font-black text-slate-400 text-lg italic">Sin actividad reciente</p>
                                    <p className="text-sm text-slate-400 mt-2 max-w-xs">
                                        Las acciones importantes de seguridad y configuración aparecerán aquí.
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
