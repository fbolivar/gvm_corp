import { createClient } from "@/lib/supabase/server";
import { supportService } from "@/features/support/services/supportService";
import { Button } from "@/shared/components/ui/button";
import {
    ChevronLeft,
    FileText,
    Package,
    Calendar,
    Hash,
    Flag,
    Tag,
    MessageSquare,
    History as HistoryIcon
} from "lucide-react";
import Link from "next/link";
import { TicketStatusBadge } from "@/features/support/components/TicketStatusBadge";
import { TicketStatusControl } from "@/features/support/components/TicketStatusControl";
import { TicketAssignControl } from "@/features/support/components/TicketAssignControl";
import { TicketInteractions } from "@/features/support/components/TicketInteractions";
import { Customer360Panel } from "@/features/support/components/Customer360Panel";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { TicketAuditLog } from "@/features/support/components/TicketAuditLog";

const PRIORITY_INFO: Record<string, { label: string; cls: string }> = {
    CRITICAL: { label: 'Prioridad Crítica', cls: 'bg-rose-50 text-rose-600' },
    HIGH: { label: 'Prioridad Alta', cls: 'bg-amber-50 text-amber-600' },
    MEDIUM: { label: 'Prioridad Media', cls: 'bg-indigo-50 text-indigo-600' },
    LOW: { label: 'Prioridad Baja', cls: 'bg-emerald-50 text-emerald-600' },
};

const CATEGORY_LABELS: Record<string, string> = {
    TECHNICAL: 'Técnico', BILLING: 'Facturación', RMA: 'Devolución (RMA)',
    LOGISTICS: 'Logística', OTHER: 'Otro',
};

function fmtDate(d: string | null | undefined): string {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
        });
    } catch { return '—'; }
}

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
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">Estado</span>
                    <TicketStatusControl ticketId={ticket.id} currentStatus={ticket.status} />
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
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${(PRIORITY_INFO[ticket.priority] ?? PRIORITY_INFO.MEDIUM).cls}`}>
                                <Flag className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">
                                    {(PRIORITY_INFO[ticket.priority] ?? PRIORITY_INFO.MEDIUM).label}
                                </span>
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
                            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Propiedades del Ticket</h3>
                        </div>
                        <div className="px-5 pb-5 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" /> Creado
                                </span>
                                <span className="text-xs font-bold text-slate-900">{fmtDate(ticket.created_at)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Flag className="h-3 w-3" /> Prioridad
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                    {(PRIORITY_INFO[ticket.priority] ?? PRIORITY_INFO.MEDIUM).label.replace('Prioridad ', '')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Tag className="h-3 w-3" /> Categoría
                                </span>
                                <span className="text-xs font-bold text-slate-900">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
                            </div>
                            {ticket.sla_deadline && (
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" /> Vencimiento SLA
                                    </span>
                                    <span className="text-xs font-bold text-slate-900">{fmtDate(ticket.sla_deadline)}</span>
                                </div>
                            )}
                            <div className="pt-4 border-t border-slate-50">
                                <TicketAssignControl
                                    ticketId={ticket.id}
                                    currentAssignedTo={ticket.assigned_to ?? null}
                                    currentName={ticket.assigned_user?.full_name}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
