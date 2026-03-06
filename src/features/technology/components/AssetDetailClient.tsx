'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import {
    Monitor, UserPlus, RotateCcw, Calendar, Tag, Cpu, HardDrive,
    ShieldCheck, Hash, DollarSign, Info,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { AssignAssetModal } from './AssignAssetModal';
import { ReturnAssetModal } from './ReturnAssetModal';
import { MaintenancePanel } from './MaintenancePanel';
import type { ITAsset, ITAssetAssignment, ITMaintenanceSchedule, ITAssetStatus } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS, CONDITION_LABELS } from '../types';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<ITAssetStatus, string> = {
    AVAILABLE: 'bg-emerald-50 text-emerald-600',
    ASSIGNED: 'bg-blue-50 text-blue-600',
    IN_MAINTENANCE: 'bg-amber-50 text-amber-600',
    RETIRED: 'bg-slate-100 text-slate-500',
    LOST: 'bg-rose-50 text-rose-600',
};

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
}

interface AssetDetailClientProps {
    asset: ITAsset;
    assignments: ITAssetAssignment[];
    maintenanceSchedules: ITMaintenanceSchedule[];
    employees: Employee[];
    currentAssignment: ITAssetAssignment | null;
}

export function AssetDetailClient({ asset, assignments, maintenanceSchedules, employees, currentAssignment }: AssetDetailClientProps) {
    const router = useRouter();
    const [assignOpen, setAssignOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);

    const specs = asset.specs || {};
    const specEntries = Object.entries(specs).filter(([, v]) => v);

    function fmtNum(n: number): string {
        const abs = Math.abs(Math.round(n));
        const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return n < 0 ? `-${formatted}` : formatted;
    }

    return (
        <div className="space-y-6">
            {/* Asset Info Card */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                <Monitor className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">{asset.name}</CardTitle>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{asset.asset_code}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={cn('text-[9px] font-semibold border-none px-2 py-0.5 rounded-full', STATUS_COLORS[asset.status])}>
                                {STATUS_LABELS[asset.status]}
                            </Badge>
                            {asset.status === 'AVAILABLE' && (
                                <Button onClick={() => setAssignOpen(true)} className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-semibold gap-1.5">
                                    <UserPlus className="h-3 w-3" /> Asignar
                                </Button>
                            )}
                            {asset.status === 'ASSIGNED' && currentAssignment && (
                                <Button onClick={() => setReturnOpen(true)} variant="outline" className="h-8 rounded-lg text-[10px] font-semibold gap-1.5">
                                    <RotateCcw className="h-3 w-3" /> Devolver
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Tag className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Categoría</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{CATEGORY_LABELS[asset.category]}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Info className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Marca / Modelo</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Hash className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Serial</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 font-mono">{asset.serial_number || '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <ShieldCheck className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Condición</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{CONDITION_LABELS[asset.condition]}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <DollarSign className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Costo</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 tabular-nums">${fmtNum(asset.purchase_cost)}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Compra</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('es-CO') : '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <ShieldCheck className="h-3 w-3" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Garantía</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString('es-CO') : '—'}</p>
                        </div>
                    </div>

                    {/* Specs */}
                    {specEntries.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Especificaciones</p>
                            <div className="flex flex-wrap gap-2">
                                {specEntries.map(([key, val]) => (
                                    <Badge key={key} variant="secondary" className="text-[10px] font-semibold gap-1">
                                        {key === 'ram' ? <HardDrive className="h-2.5 w-2.5" /> : <Cpu className="h-2.5 w-2.5" />}
                                        {key}: {val}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Current assignment */}
                    {currentAssignment && (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Asignado a</p>
                                    <p className="text-sm font-bold text-blue-900">
                                        {currentAssignment.employee
                                            ? `${currentAssignment.employee.first_name} ${currentAssignment.employee.last_name}`
                                            : 'Empleado'}
                                    </p>
                                    <p className="text-[10px] text-blue-600 mt-0.5">
                                        Desde {new Date(currentAssignment.assigned_at).toLocaleDateString('es-CO')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {asset.notes && (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notas</p>
                            <p className="text-xs text-slate-600">{asset.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Maintenance Panel */}
            <MaintenancePanel assetId={asset.id} schedules={maintenanceSchedules} />

            {/* Assignment History */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">Historial de Asignaciones</CardTitle>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Trazabilidad completa</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-50 hover:bg-transparent">
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pl-5 py-3">Empleado</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Entrega</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Devolución</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-right pr-5">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={4} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <UserPlus className="h-8 w-8 text-slate-200" />
                                            <span className="text-[10px] font-semibold text-slate-400">Sin asignaciones</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assignments.map(a => (
                                    <TableRow key={a.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="py-3 pl-5">
                                            <span className="text-sm font-semibold text-slate-700">
                                                {a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <span className="text-xs text-slate-600">{new Date(a.assigned_at).toLocaleDateString('es-CO')}</span>
                                            {a.delivery_notes && <p className="text-[10px] text-slate-400 mt-0.5">{a.delivery_notes}</p>}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            {a.returned_at ? (
                                                <div>
                                                    <span className="text-xs text-slate-600">{new Date(a.returned_at).toLocaleDateString('es-CO')}</span>
                                                    {a.return_condition && (
                                                        <Badge variant="secondary" className="text-[9px] font-semibold ml-2">
                                                            {CONDITION_LABELS[a.return_condition]}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 text-right pr-5">
                                            <Badge className={cn(
                                                'text-[9px] font-semibold border-none px-1.5 py-0.5 rounded-full',
                                                a.returned_at ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600',
                                            )}>
                                                {a.returned_at ? 'Devuelto' : 'Activo'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modals */}
            <AssignAssetModal
                open={assignOpen}
                onOpenChange={setAssignOpen}
                assetId={asset.id}
                employees={employees}
                onSuccess={() => router.refresh()}
            />
            {currentAssignment && (
                <ReturnAssetModal
                    open={returnOpen}
                    onOpenChange={setReturnOpen}
                    assignmentId={currentAssignment.id}
                    assetId={asset.id}
                    onSuccess={() => router.refresh()}
                />
            )}
        </div>
    );
}
