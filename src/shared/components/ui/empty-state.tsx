import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-14 px-6 text-center", className)}>
            {Icon && (
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-slate-400" />
                </div>
            )}
            <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-slate-500 max-w-sm">{description}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
