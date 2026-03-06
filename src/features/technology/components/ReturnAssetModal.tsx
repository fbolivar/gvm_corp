'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Loader2, RotateCcw } from 'lucide-react';
import { returnAssetAction } from '../actions/technologyActions';
import { IT_ASSET_CONDITIONS, CONDITION_LABELS } from '../types';

interface ReturnAssetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assignmentId: string;
    assetId: string;
    onSuccess: () => void;
}

export function ReturnAssetModal({ open, onOpenChange, assignmentId, assetId, onSuccess }: ReturnAssetModalProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const fd = new FormData(formRef.current!);
            fd.set('assignment_id', assignmentId);
            fd.set('asset_id', assetId);
            await returnAssetAction(fd);
            onSuccess();
            onOpenChange(false);
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
                        <RotateCcw className="h-4 w-4" /> Devolver Activo
                    </DialogTitle>
                </DialogHeader>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">{error}</div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Condición de Devolución *</Label>
                        <Select name="return_condition" required>
                            <SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="Seleccionar condición" /></SelectTrigger>
                            <SelectContent>
                                {IT_ASSET_CONDITIONS.map(c => (
                                    <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Notas de Devolución</Label>
                        <Textarea name="return_notes" placeholder="Estado del equipo, daños observados..." className="rounded-xl min-h-[60px] text-xs" />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-xl text-xs font-semibold">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold gap-2">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            Confirmar Devolución
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
