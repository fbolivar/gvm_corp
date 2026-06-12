'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Loader2, UserPlus } from 'lucide-react';
import { assignAssetAction } from '../actions/technologyActions';

interface Employee {
    id: string;
    party: { legal_name: string } | null;
}

interface AssignAssetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetId: string;
    employees: Employee[];
    onSuccess: () => void;
}

export function AssignAssetModal({ open, onOpenChange, assetId, employees, onSuccess }: AssignAssetModalProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');

    const employeeItems = employees.map(e => ({
        value: e.id,
        label: e.party?.legal_name || 'Sin nombre',
    }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedEmployee) {
            setError('Debes seleccionar un empleado.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const fd = new FormData(formRef.current!);
            fd.set('asset_id', assetId);
            fd.set('employee_id', selectedEmployee);
            await assignAssetAction(fd);
            onSuccess();
            onOpenChange(false);
            setSelectedEmployee('');
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-2xl max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <UserPlus className="h-4 w-4" /> Asignar Activo
                    </DialogTitle>
                </DialogHeader>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">{error}</div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Empleado *</Label>
                        <input type="hidden" name="employee_id" value={selectedEmployee} />
                        <SearchableSelect
                            items={employeeItems}
                            value={selectedEmployee}
                            onChange={setSelectedEmployee}
                            placeholder="Buscar empleado por nombre..."
                            emptyMessage={employees.length === 0 ? 'No hay empleados activos' : 'Sin resultados'}
                            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900"
                        />
                        {!selectedEmployee && (
                            <p className="text-[10px] text-rose-400">Debes seleccionar un empleado</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Notas de Entrega</Label>
                        <Textarea name="delivery_notes" placeholder="Accesorios entregados, observaciones..." className="rounded-xl min-h-[60px] text-xs" />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-xl text-xs font-semibold">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold gap-2">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                            Asignar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
