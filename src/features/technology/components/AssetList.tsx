'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Monitor, Search, Plus, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
import type { ITAsset, ITAssetStatus, ITAssetCategory } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS, CONDITION_LABELS, IT_ASSET_CATEGORIES, IT_ASSET_STATUSES } from '../types';

const STATUS_COLORS: Record<ITAssetStatus, string> = {
    AVAILABLE: 'bg-emerald-50 text-emerald-600',
    ASSIGNED: 'bg-blue-50 text-blue-600',
    IN_MAINTENANCE: 'bg-amber-50 text-amber-600',
    RETIRED: 'bg-slate-100 text-slate-500',
    LOST: 'bg-rose-50 text-rose-600',
};

const CATEGORY_ICONS: Record<ITAssetCategory, string> = {
    DESKTOP: 'bg-blue-50 text-blue-500',
    LAPTOP: 'bg-indigo-50 text-indigo-500',
    MOBILE: 'bg-emerald-50 text-emerald-500',
    TABLET: 'bg-violet-50 text-violet-500',
    PRINTER: 'bg-amber-50 text-amber-500',
    NETWORK: 'bg-cyan-50 text-cyan-500',
    OTHER: 'bg-slate-50 text-slate-500',
};

interface AssetListProps {
    assets: ITAsset[];
    assignmentMap?: Record<string, string>;
}

export function AssetList({ assets, assignmentMap = {} }: AssetListProps) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

    const filtered = assets.filter(a => {
        if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return a.name.toLowerCase().includes(q)
                || a.asset_code?.toLowerCase().includes(q)
                || a.serial_number?.toLowerCase().includes(q)
                || a.brand?.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <Monitor className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">Inventario de Activos</CardTitle>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{filtered.length} registros</p>
                        </div>
                    </div>
                    <Button asChild className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-semibold gap-1.5">
                        <Link href="/technology/new">
                            <Plus className="h-3 w-3" /> Nuevo Activo
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Buscar por nombre, código, serial..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="h-8 pl-9 rounded-lg text-xs"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 w-[150px] rounded-lg text-xs">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos</SelectItem>
                            {IT_ASSET_STATUSES.map(s => (
                                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="h-8 w-[150px] rounded-lg text-xs">
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas</SelectItem>
                            {IT_ASSET_CATEGORIES.map(c => (
                                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-50 hover:bg-transparent">
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pl-5 py-3">Activo</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Categoría</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Serial</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Asignado a</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Condición</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-right pr-5">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Monitor className="h-8 w-8 text-slate-200" />
                                        <span className="text-[10px] font-semibold text-slate-400">Sin activos registrados</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(asset => (
                                <TableRow key={asset.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-3 pl-5">
                                        <Link href={`/technology/${asset.id}`} className="flex items-center gap-3 group">
                                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', CATEGORY_ICONS[asset.category])}>
                                                <Monitor className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                                                    {asset.name}
                                                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </span>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{asset.asset_code}</p>
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <Badge variant="secondary" className="text-[9px] font-semibold">{CATEGORY_LABELS[asset.category]}</Badge>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <span className="text-xs text-slate-600 font-mono">{asset.serial_number || '—'}</span>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        {assignmentMap[asset.id] ? (
                                            <span className="text-xs font-semibold text-blue-600">{assignmentMap[asset.id]}</span>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <span className="text-xs text-slate-600">{CONDITION_LABELS[asset.condition]}</span>
                                    </TableCell>
                                    <TableCell className="py-3 text-right pr-5">
                                        <Badge className={cn('text-[9px] font-semibold border-none px-1.5 py-0.5 rounded-full', STATUS_COLORS[asset.status])}>
                                            {STATUS_LABELS[asset.status]}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
