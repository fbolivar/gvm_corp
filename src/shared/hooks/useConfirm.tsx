"use client"

import { useState, useCallback } from "react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"

interface ConfirmOptions {
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: "danger" | "warning" | "default"
}

/**
 * Hook that replaces native `confirm()` with a styled AlertDialog.
 *
 * Usage:
 * ```tsx
 * const [ConfirmDialogEl, confirmFn] = useConfirm()
 *
 * async function handleDelete() {
 *     const ok = await confirmFn({
 *         title: "Eliminar registro",
 *         description: "Esta accion no se puede deshacer.",
 *         variant: "danger",
 *         confirmLabel: "Eliminar",
 *     })
 *     if (!ok) return
 *     // proceed with delete...
 * }
 *
 * return (
 *     <>
 *         <button onClick={handleDelete}>Delete</button>
 *         {ConfirmDialogEl}
 *     </>
 * )
 * ```
 */
export function useConfirm(): [React.ReactNode, (options: ConfirmOptions) => Promise<boolean>] {
    const [state, setState] = useState<{
        open: boolean
        options: ConfirmOptions
        resolve: ((value: boolean) => void) | null
    }>({
        open: false,
        options: { title: "", description: "" },
        resolve: null,
    })

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setState({ open: true, options, resolve })
        })
    }, [])

    const handleConfirm = useCallback(() => {
        state.resolve?.(true)
        setState((s) => ({ ...s, open: false, resolve: null }))
    }, [state.resolve])

    const handleCancel = useCallback((open: boolean) => {
        if (!open) {
            state.resolve?.(false)
            setState((s) => ({ ...s, open: false, resolve: null }))
        }
    }, [state.resolve])

    const dialog = (
        <ConfirmDialog
            open={state.open}
            onOpenChange={handleCancel}
            title={state.options.title}
            description={state.options.description}
            confirmLabel={state.options.confirmLabel}
            cancelLabel={state.options.cancelLabel}
            variant={state.options.variant}
            onConfirm={handleConfirm}
        />
    )

    return [dialog, confirm]
}
