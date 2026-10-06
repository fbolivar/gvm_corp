import { ModuleGate } from '@/shared/components/ModuleGate'

/**
 * Guard de sub-función dentro de Compras: Encuestas a Proveedores.
 * A diferencia de /support/surveys (que no lo tenía — hueco detectado
 * 2026-09-23), este módulo nuevo sí queda protegido del lado del servidor
 * desde el día uno, con la clave compuesta "purchasing:vendor-surveys" (hereda
 * la visibilidad de "purchasing" mientras no se restrinja puntualmente — ver
 * moduleGuard.ts).
 */
export default function VendorSurveysLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="purchasing:vendor-surveys">{children}</ModuleGate>
}
