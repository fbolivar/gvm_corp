import { createClient } from "@/lib/supabase/server";
import { supportService } from "@/features/support/services/supportService";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import {
    ChevronLeft,
    Share2,
    MoreHorizontal,
    FileText,
    Package,
    Calendar,
    Hash,
    Clock
} from "lucide-react";
import Link from "next/link";
import { TicketStatusBadge } from "@/features/support/components/TicketStatusBadge";
import { TicketInteractions } from "@/features/support/components/TicketInteractions";
import { Customer360Panel } from "@/features/support/components/Customer360Panel";
import { notFound } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { TicketAuditLog } from "@/features/support/components/TicketAuditLog";
import { MessageSquare, History as HistoryIcon } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const ticket = await supportService.getTicketById(supabase, id);

    if (!ticket) notFound();

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-1">
                <Button variant="ghost" asChild className="text-slate-400 font-black hover:text-slate-900 group">
                    <Link href="/support/tickets" className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-[10px] uppercase tracking-widest">Volver a Mesa de Ayuda</span>
                    </Link>
                </Button>

                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-100 shadow-sm hover:bg-slate-50">
                        <Share2 className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-100 shadow-sm hover:bg-slate-50">
                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* LEFT: TICKET CONTENT & CHAT */}
                <div className="lg:col-span-2 space-y-12">
                    {/* Header Info */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge className="bg-slate-900 text-white border-none rounded-lg px-2 h-6 text-[10px] font-black uppercase tracking-widest">
                                {ticket.category}
                            </Badge>
                            <TicketStatusBadge status={ticket.status} className="h-6" />
                            <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 rounded-lg">
                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest italic flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" /> SLA Crítico
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter italic leading-tight">
                                {ticket.subject}
                            </h1>
                            <p className="text-slate-400 font-bold text-lg uppercase tracking-widest flex items-center gap-2">
                                <Hash className="h-4 w-4 text-indigo-500" /> {ticket.number}
                            </p>
                        </div>
                    </div>

                    {/* Description Card */}
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-premium border border-slate-50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <FileText className="h-12 w-12 text-slate-50" />
                        </div>
                        <p className="text-slate-600 leading-relaxed text-lg font-medium whitespace-pre-wrap relative z-10">
                            {ticket.description || "Sin descripción proporcionada."}
                        </p>

                        {/* Transactional Links Widget */}
                        <div className="mt-12 pt-12 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Vinculado</p>
                                {ticket.document ? (
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <FileText className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900">{ticket.document.number}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Factura de Venta</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[8px] font-black uppercase text-indigo-600 border-indigo-100">Ver</Badge>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-300 font-medium italic">Sin documento asociado</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto Reportado</p>
                                {ticket.product ? (
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-amber-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                                <Package className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900">{ticket.product.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">SKU: {ticket.product.sku}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[8px] font-black uppercase text-amber-600 border-amber-100">Stock</Badge>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-300 font-medium italic">Sin producto asociado</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Interactions & Audit Tabs */}
                    <Tabs defaultValue="conversation" className="space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <TabsList className="bg-slate-100/50 p-1 rounded-2xl h-12 border border-slate-200/50">
                                <TabsTrigger
                                    value="conversation"
                                    className="rounded-xl px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-premium data-[state=active]:text-indigo-600 font-black text-[10px] uppercase tracking-widest gap-2"
                                >
                                    <MessageSquare className="h-3.5 w-3.5" /> Conversación
                                </TabsTrigger>
                                <TabsTrigger
                                    value="audit"
                                    className="rounded-xl px-6 h-full data-[state=active]:bg-white data-[state=active]:shadow-premium data-[state=active]:text-indigo-600 font-black text-[10px] uppercase tracking-widest gap-2"
                                >
                                    <HistoryIcon className="h-3.5 w-3.5" /> Auditoría
                                </TabsTrigger>
                            </TabsList>
                            <div className="h-px flex-1 ml-4 bg-slate-50" />
                        </div>

                        <TabsContent value="conversation" className="bg-white/50 rounded-[3rem] p-10 min-h-[500px] outline-none">
                            <TicketInteractions
                                ticketId={ticket.id}
                                initialInteractions={ticket.interactions || []}
                            />
                        </TabsContent>

                        <TabsContent value="audit" className="bg-white rounded-[3rem] p-10 min-h-[500px] shadow-premium border border-slate-50 outline-none">
                            <TicketAuditLog logs={ticket.audit_logs || []} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* RIGHT: CUSTOMER 360 PANEL */}
                <div className="space-y-8">
                    <Customer360Panel partyId={ticket.party_id} ticketId={ticket.id} />

                    {/* Ticket Metadata */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem]">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-[0.15em]">Propiedades Ticket</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="flex justify-between items-center group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Vencimiento
                                </span>
                                <span className="text-xs font-black text-slate-900">22 Mar 2026</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Hash className="h-3 w-3" /> Proyecto
                                </span>
                                <span className="text-xs font-black text-slate-900 line-clamp-1">GVM-CORE-V2</span>
                            </div>
                            <div className="pt-6 border-t border-slate-50">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-4">Ubicación Solicitud</p>
                                <div className="flex items-center gap-3">
                                    <div className="h-3 w-3 rounded-full bg-indigo-500 shadow-indigo-200 shadow-lg animate-pulse" />
                                    <span className="text-xs font-black text-slate-800">Sede Principal - Bogotá</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
