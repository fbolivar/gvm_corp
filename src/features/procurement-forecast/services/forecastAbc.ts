// PRP-008 Fase 2 — clasificación ABC por comercial, con las reglas de Julián.
// Lógica pura: sin dependencias de base de datos. Testeable en aislamiento.

export interface AbcInput {
    key: string;     // product_id o sku
    value: number;   // valor neto del período (suma de los meses de la ventana)
}

export interface AbcClassified extends AbcInput {
    cumulativePct: number;   // % acumulado de Pareto (0–100)
    abc: 'A' | 'B' | 'C';
}

export interface AbcOptions {
    /** Corte de clase A por % acumulado (Julián: 92). */
    aThreshold?: number;
    /** Corte de clase B por % acumulado (Julián: 99). */
    bThreshold?: number;
    /** Un producto con valor del período por encima de este piso sube a B aunque el acumulado lo dejara en C (Julián: 600.000). */
    bValueFloor?: number;
}

const DEFAULTS: Required<AbcOptions> = { aThreshold: 92, bThreshold: 99, bValueFloor: 600_000 };

/**
 * Clasifica productos en A/B/C por valor (método Pareto) con las reglas de GVM:
 *  - A: acumulado ≤ aThreshold
 *  - B: acumulado ≤ bThreshold, o valor del período > bValueFloor (rescate por monto)
 *  - C: el resto
 * Ordena por valor descendente. Los valores ≤ 0 quedan en C sin afectar el acumulado.
 */
export function classifyAbc(items: AbcInput[], options: AbcOptions = {}): AbcClassified[] {
    const { aThreshold, bThreshold, bValueFloor } = { ...DEFAULTS, ...options };

    const sorted = [...items].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, it) => s + (it.value > 0 ? it.value : 0), 0);

    let cumulative = 0;
    return sorted.map(it => {
        if (it.value > 0) cumulative += it.value;
        const cumulativePct = total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 100;
        let abc: 'A' | 'B' | 'C';
        if (cumulativePct <= aThreshold) abc = 'A';
        else if (cumulativePct <= bThreshold) abc = 'B';
        else if (it.value > bValueFloor) abc = 'B';
        else abc = 'C';
        return { ...it, cumulativePct, abc };
    });
}
