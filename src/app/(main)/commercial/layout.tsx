import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /commercial del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function CommercialLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="commercial">{children}</ModuleGate>
}
