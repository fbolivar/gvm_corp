/**
 * Evaluación de desempeño (PRP-007).
 *
 * El gate del módulo NO va aquí: la LISTA (`page.tsx`) se protege server-side con
 * `canViewModule('payroll:performance')`, pero el DETALLE (`[id]/page.tsx`) debe poder
 * abrirlo un empleado designado como evaluador 360° aunque no tenga el módulo —ese
 * detalle aplica su propio control (gerente o evaluador asignado a ESA evaluación).
 */
export default function performanceLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
