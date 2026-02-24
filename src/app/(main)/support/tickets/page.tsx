import { createClient } from "@/lib/supabase/server";
import { supportService } from "@/features/support/services/supportService";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
    Plus,
    Search,
    Filter,
    MessageSquare,
    Clock,
    Headset,
    AlertCircle,
    ChevronRight,
    User
} from "lucide-react";
import Link from "next/link";
import { TicketStatusBadge } from "@/features/support/components/TicketStatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function TicketsPage() {
    const supabase = await createClient();
    let tickets = [];
    try {
        tickets = await supportService.getTickets(supabase);
    } catch (error: any) {
        console.error('Tickets Load Error:', error);
        return (
            <div className="m-8 p-12 bg-rose-50 border-2 border-rose-100 rounded-[3rem] text-rose-600 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-rose-500 rounded-[1.5rem] shadow-lg shadow-rose-200">
                        <AlertCircle className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tight">Error de Conexión</h2>
                        <p className="text-sm font-bold uppercase tracking-widest opacity-60">No se pudieron cargar los tickets</p>
                    </div>
                </div>
                <div className="p-8 bg-white/50 rounded-[2rem] space-y-3 font-medium text-xs leading-relaxed">
                    <p>Ocurrió un error al intentar sincronizar con la base de datos de soporte. Esto puede deberse a:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                        <li>Falta de permisos (RLS) en la tabla <code>support_tickets</code></li>
                        <li>Una relación de base de datos mal configurada</li>
                        <li>Fallo temporal en la red</li>
                    </ul>
                </div>
                <div className="pt-4 flex items-center gap-4">
                    <Button asChild className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">
                        <Link href="/support/tickets">Reintentar</Link>
                    </Button>
                    <code className="text-[10px] bg-rose-100/50 px-3 py-2 rounded-lg font-bold opacity-60">CODE: {error.code || 'UNKNOWN'}</code>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">Mesa de Ayuda</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Soporte & Experiencia al Cliente</p>
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
                            <Clock className="h-3 w-3 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">SLA Activo</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden w-64 md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <input
                            placeholder="Buscar ticket..."
                            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-100 bg-white text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <Button asChild className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                        <Link href="/support/tickets/new" className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="text-[10px] uppercase tracking-widest">Nuevo Ticket</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* TICKETS LIST */}
            <div className="grid grid-cols-1 gap-6">
                {tickets.map((ticket) => (
                    <Card key={ticket.id} className="group overflow-hidden rounded-[2rem] border-none bg-white shadow-premium hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                        <Link href={`/support/tickets/${ticket.id}`}>
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-50">
                                    <div className="p-8 flex-1 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shrink-0">
                                                    <Headset className="h-6 w-6 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{ticket.number}</span>
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            ticket.priority === 'CRITICAL' ? "bg-rose-500 animate-pulse" :
                                                                ticket.priority === 'HIGH' ? "bg-amber-500" : "bg-emerald-500"
                                                        )} />
                                                    </div>
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight italic line-clamp-1">{ticket.subject}</h3>
                                                </div>
                                            </div>
                                            <TicketStatusBadge status={ticket.status} />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                    <User className="h-3 w-3 text-indigo-600" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{ticket.party?.legal_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight">Creado hace 2 horas</span>
                                            </div>
                                            <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-400 text-[9px] font-black uppercase px-2 py-0">
                                                {ticket.category}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-50/30 w-full md:w-64 flex flex-col justify-center gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asignado a</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden shadow-sm">
                                                    {ticket.assigned_user?.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <p className="text-xs font-black text-slate-900 tracking-tight">{ticket.assigned_user?.full_name || 'Sin asignar'}</p>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                                                <span>Resolución SLA</span>
                                                <span className="text-indigo-600">85%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full w-[85%]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Link>
                    </Card>
                ))}

                {tickets.length === 0 && (
                    <div className="text-center py-32 bg-white border-2 border-dashed border-slate-100 rounded-[3rem] shadow-premium animate-in zoom-in duration-500">
                        <div className="inline-flex p-6 rounded-[2rem] bg-indigo-50 mb-6">
                            <Headset className="h-12 w-12 text-indigo-200 mx-auto" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight italic">Sin solicitudes pendientes</h3>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">Todos tus clientes están felices. No hay tickets registrados en el sistema.</p>
                        <Button asChild className="mt-8 bg-slate-900 hover:bg-primary text-white rounded-[1.5rem] h-14 px-8 font-black uppercase text-xs tracking-widest shadow-active transition-all hover:scale-105">
                            <Link href="/support/tickets/new">Crear Ticket Manual</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
