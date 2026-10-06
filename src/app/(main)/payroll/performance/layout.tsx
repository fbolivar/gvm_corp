import { ModuleGate } from '@/shared/components/ModuleGate'

/**
 * Evaluación de desempeño (PRP-007). Sub-función de Nómina: hereda el permiso
 * de `payroll` salvo restricción explícita en la matriz de Permisos finos.
 */
export default function performanceLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="payroll:performance">{children}</ModuleGate>
}
