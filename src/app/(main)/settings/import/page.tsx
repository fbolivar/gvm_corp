import { ImportWizard } from '@/features/import/components/ImportWizard'

export const metadata = {
  title: 'Importación Masiva | GVM Corp',
  description: 'Importa clientes, productos y transacciones desde archivos CSV',
}

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto mb-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 mb-1">
          Configuración / Herramientas
        </p>
        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight">
          Importación Masiva
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium max-w-xl">
          Carga clientes, productos o transacciones de forma masiva usando plantillas CSV.
          Descarga la plantilla del tipo que necesitas, rellena los datos y súbela aquí.
        </p>
      </div>

      <ImportWizard />
    </main>
  )
}
