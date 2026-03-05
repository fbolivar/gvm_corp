import { createClient } from '@/lib/supabase/server';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Badge } from "@/shared/components/ui/badge";
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

export default async function WarehousesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [warehouses, tenant] = await Promise.all([
        inventoryService.getWarehouses(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    async function addWarehouse(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;

        await inventoryService.createWarehouse(supabase, { name, code });
        revalidatePath('/inventory/warehouses');
    }

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Bodegas"
                subtitle="Inventario — Puntos de Almacenamiento"
                tenant={tenant}
            />

            <div className="grid gap-6 md:grid-cols-12 items-start">
                {/* Form */}
                <Card className="md:col-span-4 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                <Plus className="h-4 w-4" />
                            </div>
                            Nueva Bodega
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <form action={addWarehouse} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Nombre</Label>
                                <Input
                                    name="name"
                                    placeholder="Ej: Bodega Central"
                                    required
                                    className="h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-300 focus-visible:ring-1 focus-visible:ring-indigo-200"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Código</Label>
                                <Input
                                    name="code"
                                    placeholder="Ej: BP-01"
                                    required
                                    className="h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono placeholder:text-slate-300 focus-visible:ring-1 focus-visible:ring-indigo-200"
                                />
                            </div>
                            <Button type="submit" className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold">
                                <Plus className="mr-1.5 h-4 w-4" /> Crear Bodega
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="md:col-span-8 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">Bodegas Registradas</CardTitle>
                            <p className="text-[10px] text-slate-400 mt-0.5">{warehouses.length} bodegas activas</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="py-3 pl-5 text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Código</TableHead>
                                        <TableHead className="py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Nombre</TableHead>
                                        <TableHead className="py-3 pr-5 text-right text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Creación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warehouses.map((w) => (
                                        <TableRow key={w.id} className="border-slate-50 hover:bg-slate-50/50 group">
                                            <TableCell className="py-3 pl-5">
                                                <Badge className="bg-slate-100 text-slate-700 border-none rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold">
                                                    {w.code}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Link href={`/inventory/warehouses/${w.id}`} className="text-xs font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                                                    {w.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="py-3 pr-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(w.created_at!).toLocaleDateString('es-CO', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                    <Link href={`/inventory/warehouses/${w.id}`} className="h-6 w-6 rounded-md bg-slate-50 hover:bg-indigo-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {warehouses.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                                        <Building2 className="h-6 w-6 text-slate-300" />
                                                    </div>
                                                    <p className="text-xs text-slate-400">No hay bodegas registradas</p>
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
