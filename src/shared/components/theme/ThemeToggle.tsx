'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface ThemeToggleProps {
    variant?: 'icon' | 'cycle' | 'dropdown'
    className?: string
}

export function ThemeToggle({ variant = 'cycle', className }: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    if (!mounted) {
        return (
            <div className={cn('h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse', className)} />
        )
    }

    if (variant === 'cycle') {
        const isDark = resolvedTheme === 'dark'
        return (
            <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300',
                    'bg-slate-100 hover:bg-slate-200 text-slate-600',
                    'dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300',
                    'hover:scale-110 active:scale-95',
                    className
                )}
            >
                {isDark
                    ? <Sun className="h-4 w-4" />
                    : <Moon className="h-4 w-4" />
                }
            </button>
        )
    }

    // dropdown variant — 3 opciones: claro / oscuro / sistema
    const options = [
        { value: 'light', icon: Sun, label: 'Claro' },
        { value: 'dark', icon: Moon, label: 'Oscuro' },
        { value: 'system', icon: Monitor, label: 'Sistema' },
    ] as const

    return (
        <div className={cn('flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1', className)}>
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    title={label}
                    className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200',
                        theme === value
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    )}
                >
                    <Icon className="h-3.5 w-3.5" />
                </button>
            ))}
        </div>
    )
}
