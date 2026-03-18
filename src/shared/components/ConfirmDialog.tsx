"use client"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: "danger" | "warning" | "default"
    onConfirm: () => void
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "default",
    onConfirm,
}: ConfirmDialogProps) {
    const variantStyles = {
        danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
        warning: "bg-amber-500 text-slate-900 hover:bg-amber-600 focus:ring-amber-500",
        default: "bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500",
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-slate-900">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-slate-500 leading-relaxed">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-bold">
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={`rounded-xl font-bold ${variantStyles[variant]}`}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
