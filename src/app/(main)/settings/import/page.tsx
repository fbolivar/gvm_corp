import Link from 'next/link'
import { Database, Server, ArrowRight } from 'lucide-react'
import { ImportWizard } from '@/features/import/components/ImportWizard'

export const metadata = {
  title: 'Importación Masiva | GVM Corp',
  description: 'Importa clientes, productos y transacciones desde archivos CSV',
}

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto mb-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 mb-1">
          Configuración / Herramientas
        </p>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
          Importación Masiva
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium max-w-xl">
          Carga clientes, productos o transacciones de forma masiva usando plantillas CSV.
          Descarga la plantilla del tipo que necesitas, rellena los datos y súbela aquí.
        </p>
      </div>

      {/* Migración desde sistemas externos */}
      <div className="max-w-5xl mx-auto mb-10">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-600 mb-4">
          Migración desde sistemas externos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/settings/import/dolibarr"
            className="group bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-6 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="font-bold text-slate-900">Migrar desde Dolibarr</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Importa terceros, productos, bodegas, facturas, asientos contables y más desde CSVs exportados de Dolibarr.
            </p>
            <div className="flex items-center gap-1 text-sm font-bold text-emerald-700 group-hover:gap-2 transition-all">
              Abrir importador <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/settings/import/worldoffice"
            className="group bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-6 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="font-bold text-slate-900">Migrar desde WorldOffice</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Conexión directa a SQL Server de WorldOffice para extraer terceros, inventario, cuentas y empleados.
            </p>
            <div className="flex items-center gap-1 text-sm font-bold text-blue-700 group-hover:gap-2 transition-all">
              Abrir conector <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* Importación genérica */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-600 mb-4">
          Importación genérica por tipo
        </h2>
        <ImportWizard />
      </div>
    </main>
  )
}
