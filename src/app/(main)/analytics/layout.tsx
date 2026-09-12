import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /analytics del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="analytics">{children}</ModuleGate>
}
