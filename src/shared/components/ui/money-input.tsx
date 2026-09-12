"use client"

import * as React from "react"
import { Input } from "./input"

/**
 * Campo de dinero con formato colombiano.
 *
 * Problema que resuelve: un <input type="number"> interpreta "289.329" como el
 * decimal 289,329 (289 pesos), pero en Colombia se escribe "289.329" para decir
 * 289.329 pesos (punto = separador de miles). Eso hacía que los totales quedaran
 * 1000× más pequeños.
 *
 * Reglas: el punto "." es separador de MILES y la coma "," es separador DECIMAL.
 * Muestra el valor formateado (ej. "289.329" / "246.876,36") y entrega el número
 * correcto por onChange. Guarda siempre un número válido.
 */

export function formatCop(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(n)) return ""
    return n.toLocaleString("es-CO", { maximumFractionDigits: 2 })
}

export function parseCop(s: string): number {
    if (!s) return 0
    // Deja solo dígitos, puntos y comas
    const clean = s.replace(/[^\d.,]/g, "")
    if (clean.includes(",")) {
        // Coma = decimal; puntos = miles
        const idx = clean.lastIndexOf(",")
        const intPart = clean.slice(0, idx).replace(/\./g, "")
        const decPart = clean.slice(idx + 1).replace(/[.,]/g, "")
        const n = Number(`${intPart || "0"}.${decPart || "0"}`)
        return Number.isNaN(n) ? 0 : n
    }
    // Sin coma: todos los puntos son separadores de miles
    const n = Number(clean.replace(/\./g, ""))
    return Number.isNaN(n) ? 0 : n
}

interface MoneyInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
    value: number | null | undefined
    onChange: (value: number) => void
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value, onChange, onFocus, onBlur, ...rest }, ref) => {
        const [display, setDisplay] = React.useState<string>(formatCop(value))
        const [focused, setFocused] = React.useState(false)

        // Sincroniza cuando el valor cambia desde afuera (ej. autocompletar producto)
        // y no estamos escribiendo.
        React.useEffect(() => {
            if (!focused) setDisplay(formatCop(value))
        }, [value, focused])

        return (
            <Input
                ref={ref}
                inputMode="decimal"
                value={display}
                onFocus={(e) => {
                    setFocused(true)
                    onFocus?.(e)
                }}
                onBlur={(e) => {
                    setFocused(false)
                    setDisplay(formatCop(value)) // normaliza el formato al salir
                    onBlur?.(e)
                }}
                onChange={(e) => {
                    const raw = e.target.value
                    setDisplay(raw)
                    onChange(parseCop(raw))
                }}
                {...rest}
            />
        )
    }
)
MoneyInput.displayName = "MoneyInput"
