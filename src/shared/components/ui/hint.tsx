"use client"

import * as React from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip"
import { cn } from "@/shared/lib/utils"

interface HintProps {
    /** Texto principal (en negrita). */
    label: React.ReactNode
    /** Descripción opcional de "para qué sirve". */
    description?: React.ReactNode
    side?: "top" | "right" | "bottom" | "left"
    align?: "start" | "center" | "end"
    /** Si es true, no muestra tooltip (renderiza el hijo tal cual). */
    disabled?: boolean
    className?: string
    children: React.ReactNode
}

/**
 * Envoltorio simple para agregar un tooltip a cualquier elemento.
 * Requiere un <TooltipProvider> en el árbol (montado en el layout principal).
 *
 * Uso:
 *   <Hint label="Ventas" description="Cotizaciones, pedidos y facturas">
 *       <button>…</button>
 *   </Hint>
 */
export function Hint({
    label,
    description,
    side = "right",
    align = "center",
    disabled,
    className,
    children,
}: HintProps) {
    if (disabled || (!label && !description)) return <>{children}</>

    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side={side} align={align} className={cn("max-w-[250px]", className)}>
                {label && <p className="font-semibold text-xs leading-tight">{label}</p>}
                {description && (
                    <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{description}</p>
                )}
            </TooltipContent>
        </Tooltip>
    )
}
