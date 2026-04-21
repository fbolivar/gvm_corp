'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface SearchableSelectItem {
  value: string
  label: string
  subLabel?: string
  keywords?: string
}

interface SearchableSelectProps {
  items: SearchableSelectItem[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  error?: boolean
}

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = 'Buscar...',
  emptyMessage = 'Sin resultados',
  className,
  disabled = false,
  error = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedItem = useMemo(() => items.find((i) => i.value === value), [items, value])

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.slice(0, 100)
    const q = query.toLowerCase()
    return items
      .filter((item) => {
        const haystack = `${item.label ?? ''} ${item.subLabel ?? ''} ${item.keywords ?? ''}`.toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 200)
  }, [items, query])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Decide si abrir hacia arriba según espacio disponible
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const DROPDOWN_MAX = 400  // altura aprox del dropdown (input + lista)
      setOpenUpward(spaceBelow < DROPDOWN_MAX && spaceAbove > spaceBelow)
    }
    setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  function handleSelect(itemValue: string) {
    onChange(itemValue)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full text-left flex items-center justify-between gap-2',
          className,
          error && 'border-rose-500/30',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'truncate flex-1',
            !selectedItem && 'text-slate-400'
          )}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedItem && !disabled && (
            <span
              role="button"
              aria-label="Limpiar selección"
              title="Limpiar selección"
              onClick={handleClear}
              className="h-5 w-5 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-300 transition-transform',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150",
          openUpward
            ? "bottom-full mb-2 slide-in-from-bottom-2"
            : "mt-2 slide-in-from-top-2"
        )}>
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/20"
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto overscroll-contain">
            {filteredItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">{emptyMessage}</div>
            ) : (
              <ul className="py-1">
                {filteredItems.map((item) => (
                  <li key={item.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item.value)}
                      className={cn(
                        'w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-start gap-3 group transition-colors',
                        item.value === value && 'bg-indigo-50/50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {item.label}
                        </div>
                        {item.subLabel && (
                          <div className="text-[11px] text-slate-400 truncate font-medium">
                            {item.subLabel}
                          </div>
                        )}
                      </div>
                      {item.value === value && (
                        <Check className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                      )}
                    </button>
                  </li>
                ))}
                {items.length > filteredItems.length && query && (
                  <li className="px-4 py-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
                    Mostrando primeros {filteredItems.length} resultados. Afina la búsqueda para más.
                  </li>
                )}
                {!query && items.length > 100 && (
                  <li className="px-4 py-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
                    Mostrando primeros 100 de {items.length}. Escribe para buscar.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
