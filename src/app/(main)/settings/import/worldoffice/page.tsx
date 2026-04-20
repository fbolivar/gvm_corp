import { WorldOfficeImportClient } from './WorldOfficeImportClient'

// Server Action timeout — 5min para imports masivos (16k+ filas)
export const maxDuration = 300

export const metadata = {
  title: 'Importar desde WorldOffice — GVM Corp',
  description: 'Conexión directa a SQL Server WorldOffice para migrar terceros, productos, plan de cuentas y empleados.',
}

export default function WorldOfficeImportPage() {
  return <WorldOfficeImportClient />
}
