'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Monitor, Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createAssetAction } from '../actions/technologyActions';
import { IT_ASSET_CATEGORIES, IT_ASSET_CONDITIONS, CATEGORY_LABELS, CONDITION_LABELS } from '../types';

export function AssetForm() {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const fd = new FormData(formRef.current!);
            await createAssetAction(fd);
            router.push('/technology');
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-xl">{error}</div>
            )}

            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <Monitor className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">Información del Activo</CardTitle>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Datos generales</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Nombre *</Label>
                            <Input name="name" required placeholder="Ej: Laptop Dell Latitude 5540" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Categoría *</Label>
                            <Select name="category" defaultValue="LAPTOP">
                                <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {IT_ASSET_CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Marca</Label>
                            <Input name="brand" placeholder="Ej: Dell, Lenovo, Samsung" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Modelo</Label>
                            <Input name="model" placeholder="Ej: Latitude 5540" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Número de Serie</Label>
                            <Input name="serial_number" placeholder="S/N del equipo" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Condición</Label>
                            <Select name="condition" defaultValue="NEW">
                                <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {IT_ASSET_CONDITIONS.map(c => (
                                        <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="p-5 border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-900">Información Financiera</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Fecha de Compra</Label>
                            <Input name="purchase_date" type="date" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Costo de Adquisición</Label>
                            <Input name="purchase_cost" type="number" step="0.01" defaultValue="0" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Vencimiento Garantía</Label>
                            <Input name="warranty_expiry" type="date" className="h-9 rounded-xl" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-bold text-slate-900">Especificaciones</CardTitle>
                        <Badge variant="secondary" className="text-[9px] font-semibold">Opcional</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Procesador</Label>
                            <Input name="specs_procesador" placeholder="Ej: Intel i7-1365U" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">RAM</Label>
                            <Input name="specs_ram" placeholder="Ej: 16 GB" className="h-9 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Almacenamiento</Label>
                            <Input name="specs_almacenamiento" placeholder="Ej: 512 GB SSD" className="h-9 rounded-xl" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="p-5">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Notas</Label>
                        <Textarea name="notes" placeholder="Observaciones adicionales..." className="rounded-xl min-h-[80px]" />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold gap-2">
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Registrar Activo
                </Button>
            </div>
        </form>
    );
}
