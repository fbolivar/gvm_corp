import { WorldOfficeImportClient } from './WorldOfficeImportClient'

export const metadata = {
  title: 'Importar desde WorldOffice — GVM Corp',
  description: 'Conexión directa a SQL Server WorldOffice para migrar terceros, productos, plan de cuentas y empleados.',
}

export default function WorldOfficeImportPage() {
  return <WorldOfficeImportClient />
}
