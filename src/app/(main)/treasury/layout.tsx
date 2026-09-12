import { ModuleGate } from '@/shared/components/ModuleGate'

/** Protege /treasury del lado del servidor (antes el permiso solo ocultaba el menú). */
export default function TreasuryLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="treasury">{children}</ModuleGate>
}
