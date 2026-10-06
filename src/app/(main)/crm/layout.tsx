import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /crm del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="crm">{children}</ModuleGate>
}
