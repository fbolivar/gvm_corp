"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { EmptyState } from "./empty-state";

export type Alignment = "left" | "center" | "right";

export interface DataTableColumn<T> {
    key: string;
    header: React.ReactNode;
    accessor?: (row: T) => React.ReactNode;
    sortValue?: (row: T) => string | number | Date | null | undefined;
    align?: Alignment;
    width?: string;
    className?: string;
    sortable?: boolean;
}

export interface DataTableProps<T> {
    data: T[];
    columns: DataTableColumn<T>[];
    rowKey: (row: T, index: number) => string | number;
    onRowClick?: (row: T) => void;
    loading?: boolean;
    empty?: {
        icon?: LucideIcon;
        title: string;
        description?: string;
        action?: React.ReactNode;
    };
    stickyHeader?: boolean;
    className?: string;
    rowClassName?: (row: T) => string | undefined;
    footer?: React.ReactNode;
}

const alignClass: Record<Alignment, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
};

export function DataTable<T>({
    data,
    columns,
    rowKey,
    onRowClick,
    loading = false,
    empty,
    stickyHeader = false,
    className,
    rowClassName,
    footer,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = React.useState<string | null>(null);
    const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

    const sortedData = React.useMemo(() => {
        if (!sortKey) return data;
        const col = columns.find(c => c.key === sortKey);
        if (!col?.sortValue) return data;

        const copy = [...data];
        copy.sort((a, b) => {
            const av = col.sortValue!(a);
            const bv = col.sortValue!(b);
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return copy;
    }, [data, sortKey, sortDir, columns]);

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    if (loading) {
        return (
            <div className={cn("surface-card overflow-hidden", className)}>
                <div className="p-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 bg-slate-100 rounded-md animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (data.length === 0 && empty) {
        return (
            <div className={cn("surface-card", className)}>
                <EmptyState
                    icon={empty.icon}
                    title={empty.title}
                    description={empty.description}
                    action={empty.action}
                />
            </div>
        );
    }

    return (
        <div className={cn("surface-card overflow-hidden", className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className={cn("bg-slate-50/50 border-b border-slate-200", stickyHeader && "sticky top-0 z-10")}>
                        <tr>
                            {columns.map(col => {
                                const canSort = col.sortable !== false && !!col.sortValue;
                                const isSorted = sortKey === col.key;
                                return (
                                    <th
                                        key={col.key}
                                        className={cn(
                                            "px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap",
                                            alignClass[col.align || "left"],
                                            canSort && "cursor-pointer select-none hover:text-slate-900",
                                            col.className
                                        )}
                                        style={col.width ? { width: col.width } : undefined}
                                        onClick={() => canSort && toggleSort(col.key)}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {col.header}
                                            {canSort && (
                                                <span className="inline-flex flex-col -space-y-1.5">
                                                    <ChevronUp
                                                        className={cn(
                                                            "h-3 w-3 transition-colors",
                                                            isSorted && sortDir === "asc" ? "text-slate-900" : "text-slate-300"
                                                        )}
                                                    />
                                                    <ChevronDown
                                                        className={cn(
                                                            "h-3 w-3 transition-colors",
                                                            isSorted && sortDir === "desc" ? "text-slate-900" : "text-slate-300"
                                                        )}
                                                    />
                                                </span>
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, idx) => {
                            const extraClass = rowClassName?.(row);
                            return (
                                <tr
                                    key={rowKey(row, idx)}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    className={cn(
                                        "border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors",
                                        onRowClick && "cursor-pointer",
                                        extraClass
                                    )}
                                >
                                    {columns.map(col => (
                                        <td
                                            key={col.key}
                                            className={cn(
                                                "px-4 py-3 text-sm text-slate-700",
                                                alignClass[col.align || "left"],
                                                col.className
                                            )}
                                        >
                                            {col.accessor ? col.accessor(row) : null}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                    {footer && (
                        <tfoot className="border-t border-slate-200 bg-slate-50/40">{footer}</tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
