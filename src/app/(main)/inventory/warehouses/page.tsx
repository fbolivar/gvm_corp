import { createClient } from '@/lib/supabase/server';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Plus, Building2, MapPin, Calendar, Hash, ArrowLeft } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Badge } from "@/shared/components/ui/badge";

export default async function WarehousesPage() {
    const supabase = await createClient();
    const warehouses = await inventoryService.getWarehouses(supabase);

    async function addWarehouse(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;

        await inventoryService.createWarehouse(supabase, { name, code });
        revalidatePath('/inventory/warehouses');
    }

    return (
        <div className="page-container space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="page-title text-3xl md:text-4xl">Bodegas</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Puntos de Almacenamiento & Logística</p>
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{warehouses.length} Activas</span>
                        </div>
                    </div>
                </div>

                <Button variant="outline" asChild className="h-14 px-8 rounded-[1.5rem] border-none bg-white shadow-premium text-slate-500 font-black hover:bg-slate-50 transition-all active:scale-95">
                    <Link href="/inventory" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Regresar
                    </Link>
                </Button>
            </div>

            <div className="grid gap-10 md:grid-cols-12 items-start">
                <Card className="md:col-span-4 rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden group">
                    <div className="h-2 bg-slate-900 w-full" />
                    <CardHeader className="p-8">
                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                                <Plus className="h-5 w-5" />
                            </div>
                            Nueva Bodega
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <form action={addWarehouse} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Descriptivo</Label>
                                <Input
                                    name="name"
                                    placeholder="Ej: Bodega Central de Materia Prima"
                                    required
                                    className="h-14 px-6 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-primary/5 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Código Identificador (Único)</Label>
                                <Input
                                    name="code"
                                    placeholder="Ej: BP-01"
                                    required
                                    className="h-14 px-6 bg-slate-50 border-none rounded-2xl font-mono font-bold text-slate-900 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-primary/5 transition-all shadow-inner"
                                />
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all group active:scale-95 border-none">
                                <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" /> Crear Bodega
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-8 rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden">
                    <CardHeader className="p-10 pb-6 flex flex-row items-center justify-between bg-slate-50/50">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Red Logística</CardTitle>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Maestro de Bodegas Registradas</p>
                        </div>
                        <Badge variant="outline" className="h-8 rounded-full border-slate-200 text-slate-400 font-bold px-4">
                            2026 Fleet
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="py-6 pl-10 text-[10px] font-black uppercase text-slate-400 tracking-widest"><Hash className="inline h-3 w-3 mr-1" /> Código</TableHead>
                                        <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest"><MapPin className="inline h-3 w-3 mr-1" /> Nombre</TableHead>
                                        <TableHead className="py-6 pr-10 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest"><Calendar className="inline h-3 w-3 mr-1" /> Creación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warehouses.map((w) => (
                                        <TableRow key={w.id} className="border-slate-50 hover:bg-slate-50/80 transition-all group">
                                            <TableCell className="py-6 pl-10">
                                                <Badge className="bg-slate-900 text-white border-none rounded-lg px-3 py-1 font-mono text-xs tracking-wider shadow-sm">
                                                    {w.code}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-6">
                                                <span className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">
                                                    {w.name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-6 pr-10 text-right">
                                                <span className="text-xs font-bold text-slate-400">
                                                    {new Date(w.created_at!).toLocaleDateString('es-CO', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {warehouses.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                                                        <Building2 className="h-8 w-8 text-slate-200" />
                                                    </div>
                                                    <p className="text-slate-300 font-bold italic">No hay bodegas en el sistema todavía.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
