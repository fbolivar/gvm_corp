import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /production del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function ProductionLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="production">{children}</ModuleGate>
}
