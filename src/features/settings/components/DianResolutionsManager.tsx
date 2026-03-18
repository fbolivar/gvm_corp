"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Pencil, Trash2, Plus, Key } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { settingsService, DianResolution } from "@/features/settings/services/settingsService";
import { format } from "date-fns";
import { useConfirm } from "@/shared/hooks/useConfirm";

export function DianResolutionsManager({ tenantId }: { tenantId: string }) {
    const [ConfirmDialogEl, confirmFn] = useConfirm();
    const [resolutions, setResolutions] = useState<DianResolution[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingRes, setEditingRes] = useState<Partial<DianResolution> | null>(null);

    const supabase = createClient();

    const fetchResolutions = async () => {
        try {
            const data = await settingsService.getResolutions(supabase, tenantId);
            setResolutions(data);
        } catch (error) {
            toast.error("Error al cargar resoluciones");
        }
    };

    useEffect(() => {
        if (tenantId) fetchResolutions();
    }, [tenantId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await settingsService.upsertResolution(supabase, {
                ...editingRes,
                tenant_id: tenantId
            });
            toast.success("Resolución guardada exitosamente");
            setIsOpen(false);
            fetchResolutions();
        } catch (error) {
            toast.error("Error al guardar resolución");
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirmFn({ title: "Confirmar", description: "¿Está seguro de eliminar esta resolución?", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;
        try {
            await settingsService.deleteResolution(supabase, id);
            toast.success("Resolución eliminada");
            fetchResolutions();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const openNew = () => {
        setEditingRes({
            is_active: true,
            current_number: 1, // Default start
            start_range: 1,
            end_range: 1000,
        });
        setIsOpen(true);
    };

    const openEdit = (res: DianResolution) => {
        setEditingRes(res);
        setIsOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Resoluciones de Facturación</h3>
                <Button onClick={openNew} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Nueva Resolución
                </Button>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold text-slate-700">Resolución</TableHead>
                            <TableHead className="font-bold text-slate-700">Prefijo</TableHead>
                            <TableHead className="font-bold text-slate-700">Rango</TableHead>
                            <TableHead className="font-bold text-slate-700">Vigencia</TableHead>
                            <TableHead className="font-bold text-slate-700">Estado</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {resolutions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500 italic">
                                    No hay resoluciones configuradas.
                                </TableCell>
                            </TableRow>
                        ) : resolutions.map((res) => (
                            <TableRow key={res.id}>
                                <TableCell className="font-medium">{res.resolution_number}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono bg-slate-50">{res.prefix || "N/A"}</Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                    {res.start_range} - {res.end_range}
                                    <div className="text-[10px] text-slate-400 mt-1">Actual: <strong>{res.current_number}</strong></div>
                                </TableCell>
                                <TableCell className="text-xs text-slate-500">
                                    {format(new Date(res.start_date || new Date()), 'dd/MM/yy')} - {format(new Date(res.end_date || new Date()), 'dd/MM/yy')}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={res.is_active}
                                        onCheckedChange={async (chk) => {
                                            await settingsService.upsertResolution(supabase, { id: res.id, is_active: chk });
                                            fetchResolutions();
                                        }}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(res)}>
                                            <Pencil className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(res.id)}>
                                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-rose-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {ConfirmDialogEl}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingRes?.id ? "Editar Resolución" : "Nueva Resolución"}</DialogTitle>
                        <DialogDescription>Configure los detalles de numeración autorizados por la DIAN.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Número de Resolución *</Label>
                                <Input
                                    required
                                    value={editingRes?.resolution_number || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, resolution_number: e.target.value })}
                                    placeholder="Ej. 18760000001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Prefijo (Opcional)</Label>
                                <Input
                                    value={editingRes?.prefix || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, prefix: e.target.value })}
                                    placeholder="Ej. SETT"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Rango Inicial *</Label>
                                <Input
                                    type="number"
                                    required
                                    value={editingRes?.start_range || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, start_range: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Rango Final *</Label>
                                <Input
                                    type="number"
                                    required
                                    value={editingRes?.end_range || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, end_range: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Actual (Consecutivo)</Label>
                                <Input
                                    type="number"
                                    required
                                    value={editingRes?.current_number || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, current_number: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha Inicio Vigencia *</Label>
                                <Input
                                    type="date"
                                    required
                                    value={editingRes?.start_date || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, start_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha Fin Vigencia *</Label>
                                <Input
                                    type="date"
                                    required
                                    value={editingRes?.end_date || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, end_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Llave Técnica (Technical Key)</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    className="pl-10 font-mono text-xs"
                                    value={editingRes?.technical_key || ''}
                                    onChange={(e) => setEditingRes({ ...editingRes, technical_key: e.target.value })}
                                    placeholder="Clave técnica proporcionada por la DIAN"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Requerido para firmar facturas electrónicas.</p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar Resolución</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
