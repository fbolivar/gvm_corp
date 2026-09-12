/**
 * Motor de contabilización de ventas.
 *
 * Traduce una factura o nota crédito al asiento contable que definió el contador
 * en `accounting_rules` (matriz: tarifa de IVA × documento × forma de pago ×
 * tipo de contribuyente → cuenta + naturaleza).
 *
 * Es una función PURA: no toca Supabase. Así se puede probar el asiento completo
 * con Vitest sin base de datos, que es justo lo que faltaba en la versión
 * anterior (cuentas hardcodeadas, sin tests, y fallando en silencio).
 */

export type DocKind = 'FV' | 'NC';
export type PaymentForm = 'CONTADO' | 'CREDITO';
export type Nature = 'D' | 'C';

export type RuleConcept =
    | 'CARTERA'
    | 'INGRESO'
    | 'IVA'
    | 'RETEFUENTE'
    | 'RETEICA'
    | 'RETEIVA'
    | 'AUTORRENTA_ANTICIPO'
    | 'AUTORRENTA_PASIVO';

export interface AccountingRule {
    iva_rate: number;
    account_code: string;
    nature: Nature;
    concept: RuleConcept;
}

/** Tarifa y base mínima de una retención (tabla tax_configurations). */
export interface TaxRate {
    rate: number;      // porcentaje: 2.5 = 2,5%
    min_base: number;  // por debajo de esta base no se practica
}

export interface TaxRates {
    RETEFUENTE?: TaxRate;
    RETEICA?: TaxRate;
    RETEIVA?: TaxRate;
    AUTORRENTA?: TaxRate;
}

export interface EngineLine {
    qty: number;
    unit_price: number;
    /** Tarifa de IVA de la línea (0 | 5 | 19). */
    iva_rate: number;
}

export interface EngineDocument {
    doc_kind: DocKind;
    payment_form: PaymentForm;
    taxpayer_code: string;
    lines: EngineLine[];
}

export interface JournalLineDraft {
    account_code: string;
    debit: number;
    credit: number;
    concept: RuleConcept;
    /** Tarifa a la que corresponde la línea (ingreso e IVA); null en el resto. */
    iva_rate: number | null;
}

export interface EngineResult {
    lines: JournalLineDraft[];
    totals: {
        base: number;
        iva: number;
        retefuente: number;
        reteica: number;
        reteiva: number;
        autorrenta: number;
        cartera: number;
        debit: number;
        credit: number;
    };
    /** Problemas que NO impiden el asiento pero hay que mirar (faltan reglas, etc). */
    warnings: string[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Reparte el importe de una línea del asiento entre débito y crédito según la
 * naturaleza. Un importe negativo (posible si el documento trae valores
 * negativos) se pasa al lado contrario en vez de dejar un débito negativo.
 */
function split(amount: number, nature: Nature): { debit: number; credit: number } {
    const v = round2(amount);
    if (v < 0) return nature === 'D' ? { debit: 0, credit: -v } : { debit: -v, credit: 0 };
    return nature === 'D' ? { debit: v, credit: 0 } : { debit: 0, credit: v };
}

/**
 * Construye el asiento.
 *
 * Decisión de diseño: la matriz del contador está desglosada por tarifa de IVA,
 * pero una factura puede mezclar productos al 0%, 5% y 19%. Entonces:
 *  - INGRESO e IVA se emiten UNA VEZ POR TARIFA presente en el documento, con la
 *    cuenta que corresponde a esa tarifa.
 *  - CARTERA, retenciones y autorretención se emiten UNA SOLA VEZ para todo el
 *    documento, y se consideran aplicables si aparecen en las reglas de alguna
 *    de las tarifas presentes (la unión). Sin esto, una factura mixta duplicaría
 *    la retención tantas veces como tarifas tenga.
 */
export function buildSalesEntry(
    doc: EngineDocument,
    rules: AccountingRule[],
    taxes: TaxRates,
): EngineResult {
    const warnings: string[] = [];
    const lines: JournalLineDraft[] = [];

    if (rules.length === 0) {
        warnings.push(
            `Sin reglas contables para ${doc.doc_kind} / ${doc.payment_form} / ${doc.taxpayer_code}. ` +
            `Revisa la matriz del contador o el tipo de contribuyente del tercero.`,
        );
        return {
            lines,
            totals: { base: 0, iva: 0, retefuente: 0, reteica: 0, reteiva: 0, autorrenta: 0, cartera: 0, debit: 0, credit: 0 },
            warnings,
        };
    }

    // ── Bases por tarifa ───────────────────────────────────────────────────
    const baseByRate = new Map<number, number>();
    for (const l of doc.lines) {
        const amount = (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
        const rate = Number(l.iva_rate) || 0;
        baseByRate.set(rate, (baseByRate.get(rate) ?? 0) + amount);
    }

    let totalBase = 0;
    let totalIva = 0;
    const ivaByRate = new Map<number, number>();
    for (const [rate, base] of baseByRate) {
        const iva = round2(base * (rate / 100));
        ivaByRate.set(rate, iva);
        totalBase += base;
        totalIva += iva;
    }
    totalBase = round2(totalBase);
    totalIva = round2(totalIva);

    const ruleFor = (concept: RuleConcept, rate?: number) =>
        rules.find(r => r.concept === concept && (rate === undefined || Number(r.iva_rate) === rate));

    // ── Ingreso e IVA, una línea por tarifa ────────────────────────────────
    for (const [rate, base] of [...baseByRate.entries()].sort((a, b) => a[0] - b[0])) {
        const incomeRule = ruleFor('INGRESO', rate);
        if (!incomeRule) {
            warnings.push(`No hay cuenta de ingreso configurada para la tarifa ${rate}% en ${doc.doc_kind}/${doc.payment_form}/${doc.taxpayer_code}.`);
        } else {
            lines.push({ account_code: incomeRule.account_code, ...split(base, incomeRule.nature), concept: 'INGRESO', iva_rate: rate });
        }

        const iva = ivaByRate.get(rate) ?? 0;
        if (iva !== 0) {
            const ivaRule = ruleFor('IVA', rate);
            if (!ivaRule) {
                warnings.push(`Hay IVA al ${rate}% pero no hay cuenta de IVA configurada para esa tarifa.`);
            } else {
                lines.push({ account_code: ivaRule.account_code, ...split(iva, ivaRule.nature), concept: 'IVA', iva_rate: rate });
            }
        }
    }

    // ── Retenciones ────────────────────────────────────────────────────────
    // Se practican solo si el contador las incluyó para este cliente Y la base
    // supera el mínimo. Con tarifa 0 (aún sin confirmar) el valor da 0 y el
    // asiento cuadra igual, simplemente sin la línea.
    const withholding = (concept: 'RETEFUENTE' | 'RETEICA' | 'RETEIVA', over: number): number => {
        if (!ruleFor(concept)) return 0;
        const cfg = taxes[concept];
        if (!cfg || !cfg.rate) return 0;
        if (over < (cfg.min_base ?? 0)) return 0;
        return round2(over * (cfg.rate / 100));
    };

    const retefuente = withholding('RETEFUENTE', totalBase);
    const reteica = withholding('RETEICA', totalBase);
    const reteiva = withholding('RETEIVA', totalIva);

    // Autorretención: no la retiene el cliente, la declara GVM. Por eso va doble
    // (anticipo al débito y pasivo al crédito) y NO afecta el valor de la cartera.
    const autorrentaCfg = taxes.AUTORRENTA;
    const autorrenta = ruleFor('AUTORRENTA_ANTICIPO') && autorrentaCfg?.rate
        ? round2(totalBase * (autorrentaCfg.rate / 100))
        : 0;

    const emit = (concept: RuleConcept, amount: number) => {
        if (amount === 0) return;
        const rule = ruleFor(concept);
        if (!rule) return;
        lines.push({ account_code: rule.account_code, ...split(amount, rule.nature), concept, iva_rate: null });
    };

    emit('RETEFUENTE', retefuente);
    emit('RETEICA', reteica);
    emit('RETEIVA', reteiva);
    emit('AUTORRENTA_ANTICIPO', autorrenta);
    emit('AUTORRENTA_PASIVO', autorrenta);

    // ── Cartera (lo que queda por cobrar) ──────────────────────────────────
    const cartera = round2(totalBase + totalIva - retefuente - reteica - reteiva);
    const carteraRule = ruleFor('CARTERA');
    if (!carteraRule) {
        warnings.push(`No hay cuenta de cartera para ${doc.doc_kind}/${doc.payment_form}/${doc.taxpayer_code}: el asiento quedaría descuadrado.`);
    } else if (cartera !== 0) {
        lines.push({ account_code: carteraRule.account_code, ...split(cartera, carteraRule.nature), concept: 'CARTERA', iva_rate: null });
    }

    // ── Cuadre ─────────────────────────────────────────────────────────────
    // Los redondeos por tarifa pueden dejar diferencias de centavos; se ajustan
    // contra la cartera, que es la cuenta que representa el saldo real.
    let debit = round2(lines.reduce((s, l) => s + l.debit, 0));
    let credit = round2(lines.reduce((s, l) => s + l.credit, 0));
    const diff = round2(debit - credit);
    if (diff !== 0 && Math.abs(diff) <= 1) {
        const target = lines.find(l => l.concept === 'CARTERA');
        if (target) {
            if (target.debit > 0) target.debit = round2(target.debit - diff);
            else target.credit = round2(target.credit + diff);
            debit = round2(lines.reduce((s, l) => s + l.debit, 0));
            credit = round2(lines.reduce((s, l) => s + l.credit, 0));
        }
    }
    if (round2(debit - credit) !== 0) {
        warnings.push(`El asiento quedó descuadrado por ${round2(debit - credit)}. No se debe contabilizar así.`);
    }

    return {
        lines,
        totals: { base: totalBase, iva: totalIva, retefuente, reteica, reteiva, autorrenta, cartera, debit, credit },
        warnings,
    };
}

/** Tarifa de IVA de una línea: manda tax_config; si no, la categoría del producto. */
export function resolveLineIvaRate(taxConfig: unknown, taxCategory?: string | null): number {
    if (Array.isArray(taxConfig) && taxConfig.length > 0) {
        const r = Number((taxConfig[0] as { rate?: unknown })?.rate);
        if (Number.isFinite(r)) return r;
    }
    return ({ IVA_0: 0, IVA_5: 5, IVA_19: 19 } as Record<string, number>)[taxCategory ?? 'IVA_0'] ?? 0;
}

/**
 * Forma de pago efectiva del documento: la que quedó guardada y, si está vacía,
 * la que se deduce del plazo del tercero (0 días = contado).
 */
export function resolvePaymentForm(
    docPaymentForm: string | null | undefined,
    partyPaymentTermDays: number | null | undefined,
): PaymentForm {
    if (docPaymentForm === 'CONTADO' || docPaymentForm === 'CREDITO') return docPaymentForm;
    return (Number(partyPaymentTermDays) || 0) > 0 ? 'CREDITO' : 'CONTADO';
}
