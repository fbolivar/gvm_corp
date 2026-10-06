'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { deleteVisitAction } from '../actions/visitActions';

export function VisitDetailActions({ id, canDelete }: { id: string; canDelete: boolean }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    async function onDelete() {
        if (!confirm('¿Eliminar esta visita planeada?')) return;
        setDeleting(true);
        const res = await deleteVisitAction(id);
        setDeleting(false);
        if ('error' in res) { toast.error(res.error); return; }
        toast.success('Visita eliminada');
        router.push('/crm/visits');
        router.refresh();
    }

    return (
        <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 px-4 rounded-xl text-xs font-bold gap-2">
                <Link href={`/crm/visits/${id}/edit`}><Pencil className="h-3.5 w-3.5" /> Editar planeación</Link>
            </Button>
            {canDelete && (
                <Button type="button" variant="outline" disabled={deleting} onClick={onDelete}
                    className="h-11 px-4 rounded-xl text-xs font-bold gap-2 text-rose-600 border-rose-200 hover:bg-rose-50">
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Eliminar
                </Button>
            )}
        </div>
    );
}
