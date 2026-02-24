
"use client"

import { CheckCircle2, Circle, Clock, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DocumentStatus } from "@/features/documents/types";

interface Step {
    id: string;
    label: string;
    description: string;
    icon: any;
    status: 'pending' | 'active' | 'completed' | 'error';
}

interface Props {
    currentStatus: DocumentStatus;
    className?: string;
}

export function IndustrialApprovalFlow({ currentStatus, className }: Props) {
    const steps: Step[] = [
        {
            id: 'DRAFT',
            label: 'SOLICITUD',
            description: 'Registro inicial',
            icon: Clock,
            status: currentStatus === 'DRAFT' ? 'active' : 'completed'
        },
        {
            id: 'AUDIT',
            label: 'AUDITORÍA',
            description: 'Validación técnica',
            icon: ShieldCheck,
            status: currentStatus === 'DRAFT' ? 'pending' : (currentStatus === 'SENT' ? 'active' : 'completed')
        },
        {
            id: 'APPROVE',
            label: 'APROBADO',
            description: 'Listo para pago',
            icon: UserCheck,
            status: ['SENT', 'DRAFT'].includes(currentStatus) ? 'pending' : (currentStatus === 'ACCEPTED' ? 'completed' : 'pending')
        }
    ];

    return (
        <div className={cn("flex items-center gap-1", className)}>
            {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center group">
                    <div className={cn(
                        "flex flex-col items-center gap-2 px-6 py-4 rounded-[1.5rem] transition-all duration-700 relative overflow-hidden border",
                        step.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                            step.status === 'active' ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" :
                                "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
                    )}>
                        {step.status === 'active' && (
                            <div className="absolute top-0 right-0 p-2">
                                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                            </div>
                        )}

                        <step.icon className={cn(
                            "h-5 w-5",
                            step.status === 'active' && "animate-pulse"
                        )} />

                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black tracking-widest uppercase italic">{step.label}</span>
                            <span className="text-[8px] font-bold uppercase opacity-50 tracking-tight">{step.description}</span>
                        </div>
                    </div>

                    {idx < steps.length - 1 && (
                        <div className={cn(
                            "h-px w-8 bg-slate-100 italic font-black text-[10px] flex items-center justify-center -mx-2",
                            step.status === 'completed' && "bg-emerald-200"
                        )}>
                            <div className="bg-white px-1">»</div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
