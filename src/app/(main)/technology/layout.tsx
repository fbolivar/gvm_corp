import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /technology del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function TechnologyLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="technology">{children}</ModuleGate>
}
