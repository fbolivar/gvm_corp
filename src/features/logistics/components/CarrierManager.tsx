"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Carrier } from "../types"
import { logisticsService } from "../services/logisticsService"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { carrierSchema } from "../types"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import {
    Truck,
    Plus,
    Search,
    MoreVertical,
    Edit2,
    Trash2,
    Phone,
    Mail,
    User,
    CheckCircle2,
    XCircle
} from "lucide-react"

export function CarrierManager() {
    const supabase = createClient()
    const [carriers, setCarriers] = useState<Carrier[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null)

    const { register, handleSubmit, reset, formState: { errors } } = useForm<Carrier>({
        resolver: zodResolver(carrierSchema) as any
    })

    useEffect(() => {
        loadCarriers()
    }, [])

    async function loadCarriers() {
        try {
            const data = await logisticsService.getCarriers(supabase)
            setCarriers(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data: Carrier) => {
        try {
            await logisticsService.upsertCarrier(supabase, data)
            setIsAdding(false)
            setEditingCarrier(null)
            reset()
            loadCarriers()
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-1000">
            {/* Header section with Stats */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
                <div className="space-y-1 lg:space-y-2 text-center sm:text-left">
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight italic">Socios de Transporte</h2>
                    <p className="text-slate-400 font-bold text-[9px] lg:text-[10px] uppercase tracking-widest pl-1">Gestión de Aliados & Flota</p>
                </div>
                <Button
                    onClick={() => {
                        setIsAdding(true)
                        setEditingCarrier(null)
                        reset({})
                    }}
                    className="h-12 lg:h-14 px-6 lg:px-8 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none flex items-center justify-center gap-3 w-full sm:w-auto"
                >
                    <Plus className="h-5 lg:h-6 w-5 lg:w-6" />
                    <span className="text-[9px] lg:text-[10px] uppercase tracking-widest">Nueva Transportadora</span>
                </Button>
            </div>

            {/* Form for Adding/Editing */}
            {(isAdding || editingCarrier) && (
                <Card className="rounded-[2.5rem] lg:rounded-[3rem] border-none bg-white shadow-premium overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 lg:py-8 px-6 lg:px-10 text-center lg:text-left">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="h-10 lg:h-12 w-10 lg:w-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto lg:mx-0">
                                <Truck className="h-5 lg:h-6 w-5 lg:w-6 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-slate-900 text-lg lg:text-xl font-black italic tracking-tight">
                                    {editingCarrier ? 'Editar Transportadora' : 'Registro de Aliado'}
                                </CardTitle>
                                <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Información Legal & Contacto</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 lg:p-10">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                <div className="space-y-3">
                                    <Label className="text-slate-400 font-black uppercase text-[9px] lg:text-[10px] tracking-widest pl-1">Nombre de la Empresa</Label>
                                    <Input {...register('name')} placeholder="Ej: Servientrega S.A." className="h-12 lg:h-14 bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-none" />
                                    {errors.name && <p className="text-rose-500 text-[9px] lg:text-[10px] font-black uppercase tracking-tighter pl-1">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-slate-400 font-black uppercase text-[9px] lg:text-[10px] tracking-widest pl-1">NIT / ID Legal</Label>
                                    <Input {...register('nit')} placeholder="Ej: 900.123.456-1" className="h-12 lg:h-14 bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-none" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-slate-400 font-black uppercase text-[9px] lg:text-[10px] tracking-widest pl-1">Nombre de Contacto</Label>
                                    <Input {...register('contact_name')} className="h-12 lg:h-14 bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-none" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-slate-400 font-black uppercase text-[9px] lg:text-[10px] tracking-widest pl-1">Teléfono / Celular</Label>
                                    <Input {...register('phone')} className="h-12 lg:h-14 bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-none" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-slate-400 font-black uppercase text-[9px] lg:text-[10px] tracking-widest pl-1">Email Corporativo</Label>
                                    <Input {...register('email')} type="email" className="h-12 lg:h-14 bg-slate-50 border-none rounded-xl lg:rounded-2xl px-5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-none" />
                                    {errors.email && <p className="text-rose-500 text-[9px] lg:text-[10px] font-black uppercase tracking-tighter pl-1">{errors.email.message}</p>}
                                </div>
                                <div className="flex items-center gap-4 pt-4 lg:pt-8">
                                    <div className="relative inline-flex items-center cursor-pointer group">
                                        <input type="checkbox" {...register('is_active')} id="is_active" className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        <Label htmlFor="is_active" className="ml-3 text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group-hover:text-slate-600 transition-colors">Aliado Activo</Label>
                                    </div>
                                </div>
                            </div>
                            {editingCarrier && <input type="hidden" {...register('id')} value={editingCarrier.id} />}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 lg:gap-4 pt-6 mt-4 border-t border-slate-50">
                                <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingCarrier(null); }} className="h-12 lg:h-14 px-6 lg:px-8 rounded-xl lg:rounded-2xl border-none bg-slate-50 text-slate-500 font-black uppercase text-[9px] lg:text-[10px] tracking-widest hover:bg-slate-100 transition-all w-full sm:w-auto">
                                    Cancelar
                                </Button>
                                <Button type="submit" className="h-12 lg:h-14 px-8 lg:px-10 rounded-xl lg:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[9px] lg:text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 w-full sm:w-auto">
                                    {editingCarrier ? 'Guardar Cambios' : 'Registrar Socio'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Carriers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-64 rounded-[2.5rem] bg-white shadow-premium animate-pulse" />
                    ))
                ) : (
                    carriers.map(carrier => (
                        <div key={carrier.id} className="group bg-white shadow-premium rounded-[2.5rem] p-6 lg:p-8 hover:scale-[1.02] transition-all duration-500 border border-transparent hover:border-slate-100 flex flex-col justify-between">
                            <div className="space-y-4 lg:space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="h-14 lg:h-16 w-14 lg:w-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all group-hover:bg-primary/10 group-hover:text-primary shadow-sm">
                                        <Truck className="h-7 lg:h-8 w-7 lg:w-8" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 lg:h-10 w-9 lg:w-10 rounded-full bg-slate-50 text-slate-400 hover:text-primary transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                            onClick={() => {
                                                setEditingCarrier(carrier)
                                                reset(carrier)
                                            }}
                                        >
                                            <Edit2 className="h-3.5 lg:h-4 w-3.5 lg:w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight italic line-clamp-1">{carrier.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className={cn(
                                            "border-none px-3 font-black text-[9px] uppercase tracking-wider h-5 lg:h-6 rounded-full shadow-sm",
                                            carrier.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {carrier.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                        <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">NIT: {carrier.nit || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 lg:space-y-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 lg:h-8 w-7 lg:w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <User className="h-3.5 lg:h-4 w-3.5 lg:w-4" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 truncate">{carrier.contact_name || 'Sin contacto'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 lg:h-8 w-7 lg:w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Phone className="h-3.5 lg:h-4 w-3.5 lg:w-4" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">{carrier.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 lg:h-8 w-7 lg:w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Mail className="h-3.5 lg:h-4 w-3.5 lg:w-4" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 truncate">{carrier.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {!loading && carriers.length === 0 && !isAdding && (
                    <div className="col-span-full py-16 lg:py-24 text-center bg-white rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-premium px-6">
                        <div className="h-20 lg:h-24 w-20 lg:w-24 bg-slate-50 rounded-[1.5rem] lg:rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <Truck className="h-10 lg:h-12 w-10 lg:w-12 text-slate-200" />
                        </div>
                        <h3 className="text-lg lg:text-xl font-black text-slate-900 italic">Sin socios registrados</h3>
                        <p className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-widest mt-4">Comienza agregando tu primera aliada logística</p>
                    </div>
                )}
            </div>
        </div>
    )
}
