"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { saveDianResolutionAction } from "../resolutionActions"
import { toast } from "sonner"
import { Plus, Hash, Calendar, Key, FileCode, X, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
    resolutions: any[]
}

export function ResolutionManager({ resolutions }: Props) {
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries())

        try {
            await saveDianResolutionAction(data)
            toast.success("Resolución guardada correctamente")
            setShowForm(false)
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <FileCode className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Resoluciones de Facturación</h2>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="h-12 px-6 rounded-[1.5rem] bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-active transition-all hover:scale-105 active:scale-95">
                    {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {showForm ? 'Cerrar' : 'Nueva Resolución'}
                </Button>
            </div>

            {showForm && (
                <Card className="rounded-[2.5rem] border-none bg-white shadow-premium animate-in fade-in slide-in-from-top-4 duration-500">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black text-slate-900 italic">Configurar Nueva Resolución</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-2">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Prefijo</Label>
                                <Input name="prefix" placeholder="Ej: SETP" required className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Número Resolución</Label>
                                <Input name="resolutionNumber" placeholder="Ej: 1876..." required className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Desde</Label>
                                <Input name="from" type="number" placeholder="1" required className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Hasta</Label>
                                <Input name="to" type="number" placeholder="9999" required className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Fecha Resolución</Label>
                                <Input name="resolutionDate" type="date" required className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900" />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Fecha Vencimiento</Label>
                                <Input name="expiryDate" type="date" required className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900" />
                            </div>
                            <div className="md:col-span-3 space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Clave Técnica (Technical Key)</Label>
                                <Input name="technicalKey" placeholder="Hash de 40 caracteres..." required className="h-14 bg-slate-50 border-none rounded-2xl font-mono font-bold text-slate-900 placeholder:text-slate-300" />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-4 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="h-12 px-6 rounded-2xl text-slate-400 hover:text-slate-900 font-bold">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading} className="h-12 px-10 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all">
                                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Guardar Resolución</>}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[2.5rem]">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-50 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] pl-8 py-5">Prefijo</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Rango</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Vencimiento</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Estado</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5 text-right pr-8">Actual</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {resolutions.map((res) => (
                            <TableRow key={res.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-black text-primary pl-8 py-5">{res.prefix}</TableCell>
                                <TableCell className="text-slate-700 font-semibold py-5">{res.from_number} — {res.to_number}</TableCell>
                                <TableCell className="text-slate-500 text-sm py-5">
                                    {new Date(res.expiry_date).toLocaleDateString('es-CO')}
                                </TableCell>
                                <TableCell className="py-5">
                                    {res.is_active ? (
                                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] uppercase">ACTIVA</Badge>
                                    ) : (
                                        <Badge className="bg-slate-100 text-slate-400 border-none font-bold text-[9px] uppercase">INACTIVA</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right text-slate-900 font-black tracking-tighter pr-8 py-5">{res.current_number}</TableCell>
                            </TableRow>
                        ))}
                        {resolutions.length === 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="text-center py-20 text-slate-300 italic">
                                    No hay resoluciones configuradas. Configura una para empezar a facturar.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
