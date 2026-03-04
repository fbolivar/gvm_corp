"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketSchema, Ticket } from "../types";
import { createTicketAction } from "../actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";
import {
    FileText,
    Package,
    ArrowRight,
    Loader2,
    Shield
} from "lucide-react";

interface Props {
    parties: Array<{ id: string; legal_name: string }>;
    documents: Array<{ id: string; number: string; doc_type: string }>;
    products: Array<{ id: string; name: string }>;
}

export function NewTicketForm({ parties, documents, products }: Props) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Partial<Ticket>>({
        resolver: zodResolver(ticketSchema.partial()),
        defaultValues: {
            status: 'OPEN',
            priority: 'MEDIUM',
            category: 'OTHER'
        }
    });

    const onSubmit = async (data: Partial<Ticket>) => {
        setIsSubmitting(true);
        const result = await createTicketAction(data);
        setIsSubmitting(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Ticket creado exitosamente");
            router.push(`/support/tickets/${result.data.id}`);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Column 1: Core Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-0.5">Asunto de la Solicitud</label>
                                <Input
                                    {...register("subject")}
                                    placeholder="Ej: Error en facturacion #4521"
                                    className="h-10 rounded-xl border-slate-100 bg-slate-50/50 font-medium text-sm focus:ring-indigo-500/20 transition-all"
                                />
                                {errors.subject && <p className="text-xs text-rose-500 font-medium px-0.5">{errors.subject.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-0.5">Descripcion detallada</label>
                                <Textarea
                                    {...register("description")}
                                    placeholder="Explica el problema o requerimiento..."
                                    className="min-h-[160px] rounded-xl border-slate-100 bg-slate-50/50 font-medium text-sm focus:ring-indigo-500/20 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Transactional Linking */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <div className="p-5 space-y-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                    </div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vincular Factura</p>
                                </div>
                                <select
                                    {...register("ref_doc_id")}
                                    className="w-full h-9 rounded-xl border border-slate-100 bg-slate-50 text-xs font-medium px-3 focus:ring-indigo-500/20 outline-none appearance-none"
                                >
                                    <option value="">Seleccionar transaccion</option>
                                    {documents.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.number} - {doc.doc_type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <div className="p-5 space-y-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <Package className="h-3.5 w-3.5 text-amber-600" />
                                    </div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vincular Producto</p>
                                </div>
                                <select
                                    {...register("ref_product_id")}
                                    className="w-full h-9 rounded-xl border border-slate-100 bg-slate-50 text-xs font-medium px-3 focus:ring-indigo-500/20 outline-none appearance-none"
                                >
                                    <option value="">Seleccionar Item</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Side Options */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-6">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-0.5">Cliente / Party</label>
                                <select
                                    {...register("party_id")}
                                    className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium px-3 focus:ring-white/20 outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all"
                                >
                                    <option value="" className="bg-slate-900">Seleccionar cliente</option>
                                    {parties.map(p => (
                                        <option key={p.id} value={p.id} className="bg-slate-900">{p.legal_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-0.5">Categoria</label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {['TECHNICAL', 'BILLING', 'RMA', 'LOGISTICS'].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setValue("category", cat as Ticket['category'])}
                                            className={`h-9 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all border ${watch("category") === cat
                                                    ? "bg-white text-slate-900 border-white"
                                                    : "bg-transparent text-white/60 border-white/10 hover:border-white/30"
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-0.5">Prioridad</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((prio) => (
                                        <button
                                            key={prio}
                                            type="button"
                                            onClick={() => setValue("priority", prio as Ticket['priority'])}
                                            className={`h-9 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all border ${watch("priority") === prio
                                                    ? prio === 'CRITICAL' ? "bg-rose-500 text-white border-rose-400" : "bg-white text-slate-900 border-white"
                                                    : "bg-transparent text-white/60 border-white/10 hover:border-white/30"
                                                }`}
                                        >
                                            {prio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-white/10">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-9 rounded-xl bg-white hover:bg-indigo-50 text-slate-900 font-semibold text-xs uppercase tracking-wider transition-all border-none"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        Abrir Solicitud
                                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-indigo-600" />
                            <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">SLA Dinamico</p>
                        </div>
                        <p className="text-[10px] text-indigo-400 font-medium leading-relaxed">
                            El SLA se calculara automaticamente basado en el nivel VIP del cliente y la prioridad asignada.
                        </p>
                    </div>
                </div>
            </div>
        </form>
    );
}
