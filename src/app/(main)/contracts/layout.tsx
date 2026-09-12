import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /contracts del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function ContractsLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="contracts">{children}</ModuleGate>
}
