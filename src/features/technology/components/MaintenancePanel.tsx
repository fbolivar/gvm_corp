'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Wrench, Plus, CheckCircle2, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { createMaintenanceAction, completeMaintenanceAction } from '../actions/technologyActions';
import type { ITMaintenanceSchedule, ITMaintenanceStatus } from '../types';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<ITMaintenanceStatus, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-600',
    COMPLETED: 'bg-emerald-50 text-emerald-600',
    OVERDUE: 'bg-rose-50 text-rose-600',
};

const STATUS_LABELS: Record<ITMaintenanceStatus, string> = {
    SCHEDULED: 'Programado',
    COMPLETED: 'Completado',
    OVERDUE: 'Vencido',
};

interface MaintenancePanelProps {
    assetId: string;
    schedules: ITMaintenanceSchedule[];
}

export function MaintenancePanel({ assetId, schedules }: MaintenancePanelProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const fd = new FormData(formRef.current!);
            fd.set('asset_id', assetId);
            await createMaintenanceAction(fd);
            setShowForm(false);
            router.refresh();
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    async function handleComplete(id: string) {
        setCompletingId(id);
        try {
            await completeMaintenanceAction(id, 'Sistema', assetId);
            router.refresh();
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setCompletingId(null);
        }
    }

    const now = new Date();

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-900">Mantenimiento</CardTitle>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Programa ITIL</p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    variant="outline"
                    className="h-8 rounded-lg text-[10px] font-semibold gap-1.5"
                >
                    <Plus className="h-3 w-3" /> Programar
                </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">{error}</div>
                )}

                {showForm && (
                    <form ref={formRef} onSubmit={handleCreate} className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Tipo</Label>
                                <Select name="maintenance_type" defaultValue="PREVENTIVE">
                                    <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                                        <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Frecuencia (días)</Label>
                                <Input name="frequency_days" type="number" defaultValue="180" min="1" className="h-9 rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Próxima Fecha *</Label>
                                <Input name="next_due_at" type="date" required className="h-9 rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Notas</Label>
                            <Textarea name="notes" placeholder="Descripción del mantenimiento..." className="rounded-xl min-h-[60px] text-xs" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="h-8 rounded-lg text-xs">Cancelar</Button>
                            <Button type="submit" disabled={loading} className="h-8 rounded-lg bg-slate-900 text-xs font-semibold gap-1.5">
                                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calendar className="h-3 w-3" />}
                                Guardar
                            </Button>
                        </div>
                    </form>
                )}

                {schedules.length === 0 && !showForm ? (
                    <div className="py-8 text-center">
                        <Wrench className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-semibold text-slate-400">Sin mantenimientos programados</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {schedules.map(s => {
                            const isOverdue = s.status !== 'COMPLETED' && new Date(s.next_due_at) < now;
                            const displayStatus = isOverdue ? 'OVERDUE' : s.status;

                            return (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'h-8 w-8 rounded-lg flex items-center justify-center',
                                            isOverdue ? 'bg-rose-50 text-rose-500' : s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500',
                                        )}>
                                            {isOverdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-slate-700">
                                                {s.maintenance_type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
                                            </span>
                                            <p className="text-[10px] text-slate-400">
                                                Próximo: {new Date(s.next_due_at).toLocaleDateString('es-CO')}
                                                {s.frequency_days > 0 && ` · Cada ${s.frequency_days}d`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn('text-[9px] font-semibold border-none rounded-full', STATUS_COLORS[displayStatus])}>
                                            {STATUS_LABELS[displayStatus]}
                                        </Badge>
                                        {displayStatus !== 'COMPLETED' && (
                                            <Button
                                                onClick={() => handleComplete(s.id)}
                                                disabled={completingId === s.id}
                                                variant="ghost"
                                                className="h-7 w-7 p-0 rounded-lg"
                                            >
                                                {completingId === s.id
                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                    : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                }
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
