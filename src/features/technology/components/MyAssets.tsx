import { Laptop, Package, CalendarDays, Hash, FileText } from 'lucide-react';
import { CATEGORY_LABELS, CONDITION_LABELS, type ITAssetAssignment } from '../types';
import { formatLocalDate } from '@/shared/lib/dateFmt';

/**
 * Activos corporativos que el empleado tiene en su poder (asignados y no
 * devueltos). Se muestra en el portal del empleado, bajo "Mis Capacitaciones".
 */
export function MyAssets({ assignments }: { assignments: ITAssetAssignment[] }) {
    if (assignments.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-10 flex flex-col items-center justify-center gap-3">
                <Package className="h-7 w-7 text-slate-300" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Sin activos asignados
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignments.map((a) => {
                const asset = a.asset;
                const specs = [asset?.brand, asset?.model].filter(Boolean).join(' · ');
                return (
                    <div
                        key={a.id}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3"
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Laptop className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 leading-snug truncate">
                                    {asset?.name ?? 'Activo'}
                                </p>
                                <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">
                                    {asset?.category ? CATEGORY_LABELS[asset.category] ?? asset.category : 'Activo corporativo'}
                                </p>
                                {specs && (
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{specs}</p>
                                )}
                            </div>
                            {asset?.condition && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 rounded-lg px-2 py-1 shrink-0">
                                    {CONDITION_LABELS[asset.condition] ?? asset.condition}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-500 pl-[52px]">
                            {asset?.asset_code && (
                                <span className="inline-flex items-center gap-1">
                                    <Hash className="h-3 w-3 text-slate-400" />
                                    <span className="font-mono">{asset.asset_code}</span>
                                </span>
                            )}
                            {asset?.serial_number && (
                                <span className="inline-flex items-center gap-1">
                                    <span className="text-slate-400">Serie</span>
                                    <span className="font-mono">{asset.serial_number}</span>
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3 text-slate-400" />
                                Desde {formatLocalDate(a.assigned_at)}
                            </span>
                        </div>

                        {a.delivery_notes && (
                            <div className="pl-[52px]">
                                <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                                    <FileText className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="whitespace-pre-wrap break-words">{a.delivery_notes}</span>
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
