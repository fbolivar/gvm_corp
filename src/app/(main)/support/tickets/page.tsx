import { createClient } from "@/lib/supabase/server";
import { supportService } from "@/features/support/services/supportService";
import { settingsService } from "@/features/settings/services/settingsService";
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
    Plus,
    Search,
    Headset,
    AlertCircle,
    Clock,
    User
} from "lucide-react";
import Link from "next/link";
import { TicketStatusBadge } from "@/features/support/components/TicketStatusBadge";

export default async function TicketsPage() {
    const supabase = await createClient();
    const tenant = await settingsService.getTenantInfo(supabase);
    let tickets: Awaited<ReturnType<typeof supportService.getTickets>> = [];
    try {
        tickets = await supportService.getTickets(supabase);
    } catch (error: unknown) {
        const errCode = (error as { code?: string })?.code ?? 'UNKNOWN';
        return (
            <div className="m-4 p-8 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500 rounded-xl">
                        <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Error de Conexion</h2>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">No se pudieron cargar los tickets</p>
                    </div>
                </div>
                <div className="p-5 bg-white/50 rounded-xl space-y-2 font-medium text-xs leading-relaxed">
                    <p>Ocurrio un error al intentar sincronizar con la base de datos de soporte. Esto puede deberse a:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                        <li>Falta de permisos (RLS) en la tabla <code>support_tickets</code></li>
                        <li>Una relacion de base de datos mal configurada</li>
                        <li>Fallo temporal en la red</li>
                    </ul>
                </div>
                <div className="pt-2 flex items-center gap-3">
                    <Button asChild className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9 px-4 font-semibold text-xs">
                        <Link href="/support/tickets">Reintentar</Link>
                    </Button>
                    <code className="text-[10px] bg-rose-100/50 px-2 py-1 rounded-lg font-bold opacity-60">CODE: {String(errCode)}</code>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-16 animate-in fade-in duration-500">
            {/* Corporate Header */}
            <VisualReportHeader
                title="Mesa de Ayuda"
                subtitle="Soporte & Experiencia al Cliente"
                tenant={tenant}
            />

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{tickets.length} tickets</span>
                    <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        <Clock className="h-3 w-3 text-indigo-600" />
                        <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">SLA Activo</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative hidden w-56 md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                        <input
                            placeholder="Buscar ticket..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-100 bg-white text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                    <Button asChild size="sm" className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs gap-2">
                        <Link href="/support/tickets/new">
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo Ticket
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Tickets List */}
            <div className="grid grid-cols-1 gap-4">
                {tickets.map((ticket) => (
                    <Link
                        key={ticket.id}
                        href={`/support/tickets/${ticket.id}`}
                        className="block bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 group"
                    >
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-50">
                            <div className="p-5 flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors shrink-0">
                                            <Headset className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{ticket.number}</span>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    ticket.priority === 'CRITICAL' ? "bg-rose-500 animate-pulse" :
                                                        ticket.priority === 'HIGH' ? "bg-amber-500" : "bg-emerald-500"
                                                )} />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 tracking-tight line-clamp-1">{ticket.subject}</h3>
                                        </div>
                                    </div>
                                    <TicketStatusBadge status={ticket.status} />
                                </div>

                                <div className="flex flex-wrap items-center gap-4 pl-11">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-5 w-5 rounded-lg bg-indigo-50 flex items-center justify-center">
                                            <User className="h-2.5 w-2.5 text-indigo-600" />
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{ticket.party?.legal_name}</span>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 px-2 py-0.5 rounded-full">
                                        {ticket.category}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-50/30 w-full md:w-56 flex flex-col justify-center gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Asignado a</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                            {ticket.assigned_user?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <p className="text-xs font-bold text-slate-900 truncate">{ticket.assigned_user?.full_name || 'Sin asignar'}</p>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-0.5">
                                        <span>SLA</span>
                                        <span className="text-indigo-600">85%</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full w-[85%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {tickets.length === 0 && (
                    <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                        <div className="inline-flex p-4 rounded-2xl bg-indigo-50 mb-4">
                            <Headset className="h-8 w-8 text-indigo-200" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Sin solicitudes pendientes</h3>
                        <p className="text-slate-400 text-xs max-w-xs mx-auto mt-1.5 font-medium">Todos tus clientes estan felices. No hay tickets registrados.</p>
                        <Button asChild size="sm" className="mt-6 h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs">
                            <Link href="/support/tickets/new">Crear Ticket</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
