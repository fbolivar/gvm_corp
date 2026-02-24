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
import { Card, CardContent } from "@/shared/components/ui/card";
import { toast } from "sonner";
import {
    Headset,
    User,
    FileText,
    Package,
    ArrowRight,
    Loader2,
    Shield
} from "lucide-react";

interface Props {
    parties: any[];
    documents: any[];
    products: any[];
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
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Column 1: Core Info */}
                <div className="md:col-span-2 space-y-8">
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-10 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Asunto de la Solicitud</label>
                                <Input
                                    {...register("subject")}
                                    placeholder="Ej: Error en facturación #4521"
                                    className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-lg focus:ring-primary/20 transition-all"
                                />
                                {errors.subject && <p className="text-xs text-rose-500 font-bold px-1">{errors.subject.message}</p>}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción detallada</label>
                                <Textarea
                                    {...register("description")}
                                    placeholder="Explica el problema o requerimiento..."
                                    className="min-h-[200px] rounded-2xl border-slate-100 bg-slate-50/50 font-medium text-base focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transactional Linking Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Card className="border-none bg-white shadow-premium rounded-[2rem]">
                            <CardContent className="p-8 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Factura</p>
                                </div>
                                <select
                                    {...register("ref_doc_id")}
                                    className="w-full h-12 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold px-4 focus:ring-primary/20 outline-none appearance-none"
                                >
                                    <option value="">Seleccionar transacción</option>
                                    {documents.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.number} - {doc.doc_type}</option>
                                    ))}
                                </select>
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-white shadow-premium rounded-[2rem]">
                            <CardContent className="p-8 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <Package className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Producto</p>
                                </div>
                                <select
                                    {...register("ref_product_id")}
                                    className="w-full h-12 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold px-4 focus:ring-primary/20 outline-none appearance-none"
                                >
                                    <option value="">Seleccionar Item</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Column 2: Side Options */}
                <div className="space-y-8">
                    <Card className="border-none bg-slate-900 shadow-premium rounded-[2.5rem] p-8 text-white space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Cliente / Party</label>
                                <select
                                    {...register("party_id")}
                                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold px-4 focus:ring-white/20 outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all"
                                >
                                    <option value="" className="bg-slate-900">Seleccionar cliente</option>
                                    {parties.map(p => (
                                        <option key={p.id} value={p.id} className="bg-slate-900">{p.legal_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Categoría</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['TECHNICAL', 'BILLING', 'RMA', 'LOGISTICS'].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setValue("category", cat as any)}
                                            className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${watch("category") === cat
                                                    ? "bg-white text-slate-900 border-white"
                                                    : "bg-transparent text-white/60 border-white/10 hover:border-white/30"
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Prioridad</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((prio) => (
                                        <button
                                            key={prio}
                                            type="button"
                                            onClick={() => setValue("priority", prio as any)}
                                            className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${watch("priority") === prio
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

                        <div className="pt-8 border-t border-white/10">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-16 rounded-2xl bg-white hover:bg-indigo-50 text-slate-900 font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 group border-none"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Abrir Solicitud
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>

                    <div className="p-8 rounded-[2rem] bg-indigo-50 border border-indigo-100 space-y-4">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-indigo-600" />
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">SLA Dinámico</p>
                        </div>
                        <p className="text-[10px] text-indigo-400 font-bold leading-relaxed">
                            El SLA se calculará automáticamente basado en el nivel VIP del cliente y la prioridad asignada.
                        </p>
                    </div>
                </div>
            </div>
        </form>
    );
}
