import { createClient } from "@/lib/supabase/server";
import { supportService } from "@/features/support/services/supportService";
import { Button } from "@/shared/components/ui/button";
import {
    ChevronLeft,
    Share2,
    MoreHorizontal,
    FileText,
    Package,
    Calendar,
    Hash,
    Clock,
    MessageSquare,
    History as HistoryIcon
} from "lucide-react";
import Link from "next/link";
import { TicketStatusBadge } from "@/features/support/components/TicketStatusBadge";
import { TicketInteractions } from "@/features/support/components/TicketInteractions";
import { Customer360Panel } from "@/features/support/components/Customer360Panel";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { TicketAuditLog } from "@/features/support/components/TicketAuditLog";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const ticket = await supportService.getTicketById(supabase, id);

    if (!ticket) notFound();

    return (
        <div className="space-y-8 pb-16 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-1">
                <Button variant="ghost" asChild className="text-slate-400 font-semibold hover:text-slate-900 group">
                    <Link href="/support/tickets" className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-[10px] uppercase tracking-wider">Volver a Mesa de Ayuda</span>
                    </Link>
                </Button>

                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 w-9 p-0 rounded-xl border-slate-100 shadow-sm hover:bg-slate-50">
                        <Share2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                    <Button variant="outline" className="h-9 w-9 p-0 rounded-xl border-slate-100 shadow-sm hover:bg-slate-50">
                        <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Ticket content & chat */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Info */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-slate-900 text-white rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                {ticket.category}
                            </span>
                            <TicketStatusBadge status={ticket.status} />
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 rounded-lg">
                                <Clock className="h-3 w-3 text-rose-600" />
                                <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">SLA Critico</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
                                {ticket.subject}
                            </h1>
                            <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <Hash className="h-3 w-3 text-indigo-500" /> {ticket.number}
                            </p>
                        </div>
                    </div>

                    {/* Description Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
                            <FileText className="h-12 w-12" />
                        </div>
                        <p className="text-slate-600 leading-relaxed text-sm font-medium whitespace-pre-wrap relative z-10">
                            {ticket.description || "Sin descripcion proporcionada."}
                        </p>

                        {/* Transactional Links */}
                        <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Documento Vinculado</p>
                                {ticket.document ? (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">{ticket.document.number}</p>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase">Factura de Venta</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold text-indigo-600 uppercase">Ver</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-300 font-medium">Sin documento asociado</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Producto Reportado</p>
                                {ticket.product ? (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-amber-200 transition-all">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                                                <Package className="h-3.5 w-3.5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">{ticket.product.name}</p>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase">SKU: {ticket.product.sku}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold text-amber-600 uppercase">Stock</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-300 font-medium">Sin producto asociado</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Interactions & Audit Tabs */}
                    <Tabs defaultValue="conversation" className="space-y-6">
                        <TabsList className="bg-slate-50 border border-slate-100 rounded-xl p-1 h-auto gap-1">
                            <TabsTrigger
                                value="conversation"
                                className="rounded-lg text-[10px] font-semibold uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-1.5"
                            >
                                <MessageSquare className="h-3 w-3" /> Conversacion
                            </TabsTrigger>
                            <TabsTrigger
                                value="audit"
                                className="rounded-lg text-[10px] font-semibold uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-1.5"
                            >
                                <HistoryIcon className="h-3 w-3" /> Auditoria
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="conversation" className="bg-white/50 rounded-2xl p-6 min-h-[400px] outline-none">
                            <TicketInteractions
                                ticketId={ticket.id}
                                initialInteractions={ticket.interactions || []}
                            />
                        </TabsContent>

                        <TabsContent value="audit" className="bg-white rounded-2xl p-6 min-h-[400px] shadow-sm border border-slate-100 outline-none">
                            <TicketAuditLog logs={ticket.audit_logs || []} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* RIGHT: Customer 360 panel */}
                <div className="space-y-6">
                    <Customer360Panel partyId={ticket.party_id} ticketId={ticket.id} />

                    {/* Ticket Metadata */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="p-5 pb-3">
                            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Propiedades Ticket</h3>
                        </div>
                        <div className="px-5 pb-5 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" /> Vencimiento
                                </span>
                                <span className="text-xs font-bold text-slate-900">22 Mar 2026</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Hash className="h-3 w-3" /> Proyecto
                                </span>
                                <span className="text-xs font-bold text-slate-900 line-clamp-1">GVM-CORE-V2</span>
                            </div>
                            <div className="pt-4 border-t border-slate-50">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Ubicacion Solicitud</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                                    <span className="text-xs font-bold text-slate-800">Sede Principal - Bogota</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
