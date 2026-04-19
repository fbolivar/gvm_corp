import * as React from "react";
import { cn } from "@/shared/lib/utils";

export function FormLayout({
    children,
    footer,
    className,
}: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("surface-card overflow-hidden", className)}>
            <div className="p-5 md:p-6 space-y-6 md:space-y-8">{children}</div>
            {footer && (
                <div className="border-t border-slate-100 px-5 md:px-6 py-4 bg-slate-50/40 flex items-center justify-end gap-2 flex-wrap">
                    {footer}
                </div>
            )}
        </div>
    );
}

export function FormSection({
    title,
    description,
    children,
    className,
    columns = 2,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    columns?: 1 | 2 | 3;
}) {
    const gridClass =
        columns === 3 ? "md:grid-cols-3" :
        columns === 2 ? "md:grid-cols-2" :
        "md:grid-cols-1";

    return (
        <section className={cn("space-y-4", className)}>
            {(title || description) && (
                <header className="space-y-1">
                    {title && <h2 className="text-h3">{title}</h2>}
                    {description && <p className="text-caption">{description}</p>}
                </header>
            )}
            <div className={cn("grid grid-cols-1 gap-4", gridClass)}>{children}</div>
        </section>
    );
}

export function FormField({
    label,
    htmlFor,
    hint,
    error,
    required,
    children,
    colSpan = 1,
    className,
}: {
    label?: string;
    htmlFor?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    colSpan?: 1 | 2 | 3;
    className?: string;
}) {
    const spanClass =
        colSpan === 3 ? "md:col-span-3" :
        colSpan === 2 ? "md:col-span-2" :
        "";

    return (
        <div className={cn("space-y-1.5", spanClass, className)}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="block text-xs font-medium text-slate-700"
                >
                    {label}
                    {required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>
    );
}
