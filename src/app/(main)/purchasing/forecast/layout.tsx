import { ModuleGate } from '@/shared/components/ModuleGate'

/**
 * Forecast de compras (PRP-008). Sub-función de Compras: hereda el permiso de
 * `purchasing` salvo restricción explícita en la matriz de Permisos finos.
 */
export default function forecastLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="purchasing:forecast">{children}</ModuleGate>
}
