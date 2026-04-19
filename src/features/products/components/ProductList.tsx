"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Product, TAX_LABELS } from "../types"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { useDebounce } from "@/shared/hooks/useDebounce"
import {
    Plus,
    Search,
    Package,
    Edit3,
    ScanBarcode,
    AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import { DataTable, DataTableColumn } from "@/shared/components/ui/data-table"
import { StatusBadge, statusToTone } from "@/shared/components/ui/status-badge"

interface ProductListProps {
    initialData: Product[]
    totalCount: number
    currentPage: number
    perPage: number
}

export function ProductList({ initialData, totalCount, currentPage, perPage }: ProductListProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState(searchParams.get("search") || "")
    const debouncedSearch = useDebounce(search, 500)
    const isFirstRender = useRef(true)

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedSearch) {
            params.set("search", debouncedSearch)
        } else {
            params.delete("search")
        }
        params.set("page", "1")
        router.push(`${pathname}?${params.toString()}`)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch])

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("page", newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    const totalPages = Math.ceil(totalCount / perPage)

    const columns: DataTableColumn<Product>[] = [
        {
            key: "product",
            header: "Producto",
            sortValue: (row) => row.name,
            accessor: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{row.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{row.sku || "N/A"}</span>
                    </div>
                </div>
            ),
        },
        {
            key: "sku",
            header: "SKU",
            width: "120px",
            sortValue: (row) => row.sku ?? "",
            accessor: (row) => (
                <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                    {row.sku || "—"}
                </span>
            ),
        },
        {
            key: "barcode",
            header: "Barcode",
            width: "160px",
            accessor: (row) =>
                row.barcode ? (
                    <div className="flex items-center gap-1.5">
                        <ScanBarcode className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[11px] font-mono text-slate-600">{row.barcode}</span>
                    </div>
                ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                ),
        },
        {
            key: "tax_category",
            header: "Categoría IVA",
            width: "150px",
            sortValue: (row) => row.tax_category ?? "",
            accessor: (row) => (
                <div className="space-y-1">
                    <Badge
                        variant="outline"
                        className="border-slate-200 text-slate-500 text-[10px] font-semibold rounded-full px-2 py-0.5"
                    >
                        {row.type === "GOOD" ? "Bien" : "Servicio"}
                    </Badge>
                    <p className="text-[10px] text-slate-400">
                        {row.tax_category ? TAX_LABELS[row.tax_category] : row.tax_category}
                    </p>
                </div>
            ),
        },
        {
            key: "selling_price",
            header: "Precio venta",
            align: "right",
            width: "130px",
            sortValue: (row) => row.selling_price ?? 0,
            accessor: (row) => (
                <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                        ${(row.selling_price ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-slate-400">{row.uom}</span>
                </div>
            ),
        },
        {
            key: "stock_qty",
            header: "Stock",
            align: "right",
            width: "100px",
            sortValue: (row) => row.stock_qty ?? 0,
            accessor: (row) => {
                const qty = row.stock_qty ?? 0
                const min = row.min_stock ?? 0
                const isLow = qty <= min && min > 0
                return (
                    <div className={cn(
                        "inline-flex items-center gap-1 font-bold text-sm tabular-nums",
                        isLow ? "text-amber-600" : qty > 0 ? "text-emerald-600" : "text-rose-500"
                    )}>
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                        {qty}
                    </div>
                )
            },
        },
        {
            key: "status",
            header: "Estado",
            align: "center",
            width: "110px",
            sortValue: (row) => row.status,
            accessor: (row) => (
                <StatusBadge tone={statusToTone(row.status)} dot>
                    {row.status === "ACTIVE" ? "Activo" : row.status === "INACTIVE" ? "Inactivo" : "Archivado"}
                </StatusBadge>
            ),
        },
        {
            key: "actions",
            header: "",
            align: "right",
            width: "60px",
            accessor: (row) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                        asChild
                    >
                        <Link href={`/products/${row.id}`}>
                            <Edit3 className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white rounded-xl p-3 border border-slate-100">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-10 bg-slate-50 border-none rounded-lg text-sm placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-200"
                    />
                </div>
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs">
                    <Link href="/products/new" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Item
                    </Link>
                </Button>
            </div>

            {/* DataTable */}
            <DataTable<Product>
                data={initialData}
                columns={columns}
                rowKey={(row) => row.id ?? row.sku}
                onRowClick={(row) => router.push(`/products/${row.id}`)}
                empty={{
                    icon: Package,
                    title: "Sin resultados",
                    description: "No hay productos que coincidan con la búsqueda.",
                }}
                className="rounded-xl border border-slate-100 shadow-none"
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100 w-fit mx-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="rounded-lg border-slate-200 text-xs font-semibold"
                    >
                        Anterior
                    </Button>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Pag</span>
                        <span className="bg-indigo-600 text-white font-bold text-[10px] h-6 w-6 rounded-md flex items-center justify-center">
                            {currentPage}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">/ {totalPages}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="rounded-lg border-slate-200 text-xs font-semibold"
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    )
}
