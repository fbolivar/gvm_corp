import { DolibarrImporter } from './DolibarrImporter'

export const metadata = {
  title: 'Importar desde Dolibarr | GVM Corp',
  description: 'Importa terceros, productos, facturas y asientos contables desde CSVs exportados de Dolibarr',
}

export default function ImportDolibarrPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto mb-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 mb-1">
          Configuración / Importación
        </p>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
          Migración desde Dolibarr
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium max-w-2xl">
          Carga los archivos CSV exportados de Dolibarr en el orden correcto.
          El sistema importa con upsert idempotente y valida dependencias (bodegas antes de stock, terceros antes de facturas, etc.).
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <DolibarrImporter />
      </div>
    </main>
  )
}
