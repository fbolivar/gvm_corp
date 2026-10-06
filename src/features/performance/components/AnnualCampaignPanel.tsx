'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openAnnualCampaignAction, closeAnnualCampaignAction } from '../annualActions';
import { Button } from '@/shared/components/ui/button';

export interface OpenCampaign {
    id: string;
    name: string;
    opensOn: string;
    closesOn: string;
}

interface Props {
    openCampaign: OpenCampaign | null;
    defaultWindow: { opensOn: string; closesOn: string };
    defaultName: string;
    canManage: boolean;
}

export function AnnualCampaignPanel({ openCampaign, defaultWindow, defaultName, canManage }: Props) {
    const router = useRouter();
    const [name, setName] = useState(defaultName);
    const [opensOn, setOpensOn] = useState(defaultWindow.opensOn);
    const [closesOn, setClosesOn] = useState(defaultWindow.closesOn);
    const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
    const [pending, startTransition] = useTransition();

    function open() {
        setMessage(null);
        startTransition(async () => {
            const res = await openAnnualCampaignAction({ name, opensOn, closesOn });
            if (res.error) return setMessage({ type: 'error', text: res.error });
            setMessage({ type: 'ok', text: `Campaña abierta: ${res.value} evaluaciones creadas.` });
            router.refresh();
        });
    }

    function close() {
        if (!openCampaign) return;
        setMessage(null);
        startTransition(async () => {
            const res = await closeAnnualCampaignAction(openCampaign.id);
            if (res.error) return setMessage({ type: 'error', text: res.error });
            router.refresh();
        });
    }

    if (openCampaign) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Campaña anual abierta</p>
                    <p className="text-base font-bold text-slate-900">{openCampaign.name}</p>
                    <p className="text-xs text-slate-500">Del {openCampaign.opensOn} al {openCampaign.closesOn}</p>
                </div>
                {canManage && (
                    <Button type="button" variant="outline" onClick={close} disabled={pending} className="h-11 rounded-xl">
                        {pending ? 'Cerrando…' : 'Cerrar campaña'}
                    </Button>
                )}
                {message && <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
            </div>
        );
    }

    if (!canManage) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-sm text-slate-500">
                No hay campaña anual abierta.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div>
                <h3 className="text-sm font-bold text-slate-900">Abrir campaña anual</h3>
                <p className="text-xs text-slate-500">Crea una evaluación por cada empleado activo con cargo asignado. Ventana por defecto: diciembre.</p>
            </div>
            <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nombre</span>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={120}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Apertura</span>
                    <input type="date" value={opensOn} onChange={e => setOpensOn(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cierre</span>
                    <input type="date" value={closesOn} onChange={e => setClosesOn(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
            </div>
            {message && <p className="text-sm text-red-600">{message.text}</p>}
            <Button type="button" onClick={open} disabled={pending || !name.trim()} className="w-full h-11 rounded-xl">
                {pending ? 'Abriendo…' : 'Abrir campaña'}
            </Button>
        </div>
    );
}
