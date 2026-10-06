import { ModuleGate } from '@/shared/components/ModuleGate'

/**
 * Guard de sub-función dentro de Nómina: Puntualidad.
 * Complementa (no reemplaza) el guard general de payroll/layout.tsx — un rol
 * con acceso a "payroll" ve esta pantalla salvo que un administrador la
 * restrinja puntualmente en Configuración → Equipo → Roles y Permisos
 * (matriz "Permisos finos de Nómina"). Ver moduleGuard.ts para el fallback.
 */
export default function punctualityLayout({ children }: { children: React.ReactNode }) {
    return <ModuleGate moduleKey="payroll:punctuality">{children}</ModuleGate>
}
