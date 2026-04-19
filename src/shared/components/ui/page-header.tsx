import * as React from "react";
import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface Crumb {
    label: string;
    href?: string;
}

export interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    eyebrow?: string;
    breadcrumbs?: Crumb[];
    actions?: React.ReactNode;
    meta?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    icon: Icon,
    eyebrow,
    breadcrumbs,
    actions,
    meta,
    className,
}: PageHeaderProps) {
    return (
        <header className={cn("mb-6 md:mb-8", className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb" className="mb-3">
                    <ol className="flex items-center gap-1.5 text-xs text-slate-500">
                        {breadcrumbs.map((crumb, idx) => {
                            const isLast = idx === breadcrumbs.length - 1;
                            return (
                                <li key={idx} className="flex items-center gap-1.5">
                                    {idx > 0 && (
                                        <ChevronRight className="h-3 w-3 text-slate-300" />
                                    )}
                                    {crumb.href && !isLast ? (
                                        <Link
                                            href={crumb.href}
                                            className="hover:text-slate-900 transition-colors"
                                        >
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className={cn(isLast && "text-slate-900 font-medium")}>
                                            {crumb.label}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            )}

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                    {Icon && (
                        <div className="hidden md:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                            <Icon className="h-5 w-5" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        {eyebrow && (
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                {eyebrow}
                            </p>
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
                                {description}
                            </p>
                        )}
                        {meta && <div className="mt-3">{meta}</div>}
                    </div>
                </div>
                {actions && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}
