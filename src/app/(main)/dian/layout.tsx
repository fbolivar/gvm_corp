import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /dian del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function DianLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="dian">{children}</ModuleGate>
}
