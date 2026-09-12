import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /budget del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function BudgetLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="budget">{children}</ModuleGate>
}
