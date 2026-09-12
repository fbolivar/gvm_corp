import Link from 'next/link'
import { Paperclip } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/**
 * Indicador de soportes de un documento para los listados.
 * Enlaza directo a la sección de soportes del documento (#soportes), para que
 * revisoría no tenga que entrar documento por documento buscando los adjuntos.
 */
export function AttachmentBadge({ documentId, count, className }: {
    documentId: string;
    count: number;
    className?: string;
}) {
    if (!count) {
        return (
            <span
                className={cn('inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300', className)}
                title="Sin soportes cargados"
            >
                <Paperclip className="h-3 w-3" />
                —
            </span>
        )
    }

    return (
        <Link
            href={`/documents/${documentId}#soportes`}
            title={`Ver ${count} soporte(s) del documento`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
                'inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors',
                className
            )}
        >
            <Paperclip className="h-3 w-3" />
            {count}
        </Link>
    )
}
