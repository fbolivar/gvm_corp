'use client'

import { useState, useEffect } from 'react'
import {
  Printer, QrCode, Tag, Download, Loader2,
  CheckCircle2, WifiOff, Wifi,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { toast } from 'sonner'
import {
  getConnectedPrinter,
  generateZpl,
  sendToPrinter,
  downloadZpl,
  type LabelData,
  type LabelType,
  type ZebraDevice,
} from '../services/labelPrinterService'

interface Props {
  product: LabelData
  /** 'button' muestra texto + icono; 'icon' solo el icono (para tablas) */
  variant?: 'button' | 'icon'
  defaultQty?: number
}

export function PrintLabelButton({ product, variant = 'button', defaultQty = 1 }: Props) {
  const [open, setOpen] = useState(false)
  const [printer, setPrinter] = useState<ZebraDevice | null | 'loading'>('loading')
  const [labelType, setLabelType] = useState<LabelType>('barcode')
  const [qty, setQty] = useState(defaultQty)
  const [printing, setPrinting] = useState(false)

  // Buscar impresora cada vez que se abre el diálogo
  useEffect(() => {
    if (!open) return
    setPrinter('loading')
    getConnectedPrinter().then(setPrinter)
  }, [open])

  // Sincronizar qty por defecto cuando cambia desde el padre (líneas OC)
  useEffect(() => {
    setQty(defaultQty)
  }, [defaultQty])

  const zpl = generateZpl(product, labelType, qty)

  async function handlePrint() {
    if (!printer || printer === 'loading') return
    setPrinting(true)
    const result = await sendToPrinter(printer as ZebraDevice, zpl)
    setPrinting(false)
    if (result.success) {
      toast.success(`${qty} etiqueta${qty !== 1 ? 's' : ''} enviada${qty !== 1 ? 's' : ''} a impresora`)
      setOpen(false)
    } else {
      toast.error('Error al imprimir. Usa "Descargar .ZPL" como alternativa.')
    }
  }

  function handleDownload() {
    downloadZpl(zpl, product.sku)
    toast.success('Archivo .zpl descargado — ábrelo con Zebra Designer o envíalo por red')
  }

  const printerReady = printer !== 'loading' && printer !== null

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Imprimir etiqueta"
          className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 text-slate-400 hover:text-amber-600 flex items-center justify-center transition-all active:scale-90"
        >
          <Printer className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-9 gap-2 rounded-xl border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50 font-bold text-xs"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir Etiqueta
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="bg-slate-900 px-6 py-5">
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="h-9 w-9 rounded-2xl bg-amber-400 flex items-center justify-center shrink-0">
                <Printer className="h-4 w-4 text-slate-900" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">Imprimir Etiqueta</p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Zebra ZD230</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5 bg-white">
            {/* Producto */}
            <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Producto</p>
              <p className="text-sm font-black text-slate-900 truncate leading-tight">{product.name}</p>
              <p className="text-xs font-mono text-slate-500 mt-0.5">{product.sku}</p>
              {product.price && (
                <p className="text-xs font-bold text-emerald-700 mt-0.5">
                  $ {product.price.toLocaleString('es-CO')}
                </p>
              )}
            </div>

            {/* Estado impresora */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
              printer === 'loading' ? 'bg-slate-50 border-slate-100'
              : printerReady ? 'bg-emerald-50 border-emerald-100'
              : 'bg-rose-50 border-rose-100'
            }`}>
              {printer === 'loading' ? (
                <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />
              ) : printerReady ? (
                <Wifi className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <WifiOff className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-black ${
                  printer === 'loading' ? 'text-slate-500'
                  : printerReady ? 'text-emerald-700'
                  : 'text-rose-600'
                }`}>
                  {printer === 'loading' ? 'Buscando impresora...'
                   : printerReady ? `Conectada — ${(printer as ZebraDevice).model}`
                   : 'Sin impresora detectada'}
                </p>
                {!printerReady && printer !== 'loading' && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Instala Zebra Browser Print para imprimir directo.
                    Usa &quot;Descargar .ZPL&quot; como alternativa.
                  </p>
                )}
              </div>
              {!printerReady && printer !== 'loading' && (
                <button
                  type="button"
                  onClick={() => { setPrinter('loading'); getConnectedPrinter().then(setPrinter) }}
                  className="ml-auto shrink-0 text-[10px] font-black text-slate-400 hover:text-slate-700 underline"
                >
                  Reintentar
                </button>
              )}
            </div>

            {/* Tipo de etiqueta */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de etiqueta</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { type: 'barcode' as LabelType, label: 'Código de Barras', Icon: Tag },
                  { type: 'qr' as LabelType, label: 'Código QR', Icon: QrCode },
                ] as const).map(({ type, label, Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLabelType(type)}
                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all text-xs font-black ${
                      labelType === type
                        ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-inner'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-slate-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad */}
            <div className="flex items-center gap-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex-1">
                Cantidad de etiquetas
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg leading-none flex items-center justify-center transition-all"
                >−</button>
                <span className="w-8 text-center text-sm font-black text-slate-900 tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(q => Math.min(200, q + 1))}
                  className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg leading-none flex items-center justify-center transition-all"
                >+</button>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                className="flex-1 h-11 rounded-2xl gap-2 text-xs font-black border-slate-200 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                .ZPL
              </Button>
              <Button
                type="button"
                disabled={!printerReady || printing}
                onClick={handlePrint}
                className="flex-[2] h-11 rounded-2xl gap-2 text-xs font-black bg-slate-900 hover:bg-slate-700 text-white shadow-active active:scale-95 disabled:opacity-40"
              >
                {printing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {printing ? 'Imprimiendo...' : `Imprimir ${qty > 1 ? `${qty} etiquetas` : 'etiqueta'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
