import { WorldOfficeImporter } from './WorldOfficeImporter'

export const metadata = { title: 'Importar desde WorldOffice — GVM Corp' }

export default function WorldOfficeImportPage() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <WorldOfficeImporter />
    </div>
  )
}
