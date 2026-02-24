"use client"

import { LeadForm } from '@/features/crm/components/LeadForm';
import { createLeadAction } from '@/features/crm/actions';
import { Lead } from "@/features/crm/types";
import { Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function NewLeadPage() {
    const handleSubmit = async (data: Lead) => {
        const result = await createLeadAction(data);
        if (result?.error) {
            toast.error(`Error: ${result.error}`);
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">Nuevo Prospecto</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Iniciar Seguimiento Comercial</p>
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
                            <Sparkles className="h-3 w-3 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">CRM</span>
                        </div>
                    </div>
                </div>
            </div>

            <LeadForm onSubmit={handleSubmit} />
        </div>
    );
}
