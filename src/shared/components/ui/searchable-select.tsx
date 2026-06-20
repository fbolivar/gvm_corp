'use client'

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X, Check, Plus } from 'lucide-react'
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
  /** Permite crear una entrada de texto libre cuando lo escrito no está en la lista. */
  allowCreate?: boolean
  /** Callback al elegir crear: recibe el texto escrito. */
  onCreate?: (text: string) => void
  /** Etiqueta de la opción de crear. Por defecto: «Usar "X"». */
  createLabel?: (text: string) => string
  /** Texto a mostrar en el botón cuando no hay item seleccionado (ej. nombre libre). */
  customLabel?: string
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
  allowCreate = false,
  onCreate,
  createLabel,
  customLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0, left: 0, width: 0, openUpward: false,
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // SSR safety: solo montar el portal en el cliente
  useEffect(() => { setMounted(true) }, [])

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

  // Calcular posición del dropdown basada en el trigger
  const recalcPosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const DROPDOWN_MAX = 400
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpward = spaceBelow < DROPDOWN_MAX && spaceAbove > spaceBelow

    // El dropdown se ensancha más allá del campo (que puede ser angosto) para
    // mostrar la referencia completa, sin salirse de la pantalla.
    const MIN_WIDTH = 360
    const width = Math.min(Math.max(rect.width, MIN_WIDTH), window.innerWidth - 16)
    let left = rect.left
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }

    setPos({
      top: openUpward ? rect.top - 8 : rect.bottom + 8,
      left,
      width,
      openUpward,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    recalcPosition()
  }, [open])

  // Close on outside click + recalc on scroll/resize
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const inTrigger = triggerRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inTrigger && !inDropdown) {
        setOpen(false)
        setQuery('')
      }
    }
    function handleViewportChange() { recalcPosition() }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  function handleSelect(itemValue: string) {
    onChange(itemValue)
    setOpen(false)
    setQuery('')
  }

  function handleCreate() {
    const text = query.trim()
    if (!text) return
    onCreate?.(text)
    setOpen(false)
    setQuery('')
  }

  // Mostrar la opción de crear cuando hay texto y no coincide exactamente con un item
  const showCreate = useMemo(() => {
    if (!allowCreate || !onCreate) return false
    const q = query.trim().toLowerCase()
    if (!q) return false
    return !items.some((i) => i.label.trim().toLowerCase() === q)
  }, [allowCreate, onCreate, query, items])

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
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
        <span className={cn('truncate flex-1', !selectedItem && !customLabel && 'text-slate-400')}>
          {selectedItem ? selectedItem.label : (customLabel || placeholder)}
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
          <ChevronDown className={cn('h-4 w-4 text-slate-300 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {mounted && open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.openUpward ? 'auto' : pos.top,
            bottom: pos.openUpward ? window.innerHeight - pos.top : 'auto',
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150"
        >
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
            {showCreate && (
              <button
                type="button"
                onClick={handleCreate}
                className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 border-b border-slate-100 transition-colors"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold truncate">
                  {createLabel ? createLabel(query.trim()) : `Usar «${query.trim()}»`}
                </span>
              </button>
            )}
            {filteredItems.length === 0 && !showCreate ? (
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
                        <div className="text-sm font-semibold text-slate-900 break-words">{item.label}</div>
                        {item.subLabel && (
                          <div className="text-[11px] text-slate-400 truncate font-medium">{item.subLabel}</div>
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
        </div>,
        document.body
      )}
    </div>
  )
}
