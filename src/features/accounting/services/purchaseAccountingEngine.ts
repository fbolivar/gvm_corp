/**
 * Motor de contabilización de COMPRAS (espejo del de ventas).
 *
 * Traduce una compra remisionada (CREM) o una devolución a proveedor (DMP) al
 * asiento que definió el contador en `purchase_accounting_rules`
 * (matriz: tarifa de IVA × documento × forma de pago × tipo de contribuyente → cuenta + naturaleza).
 *
 * Estructura del asiento de una compra:
 *   Débito  : Inventario (143501/03/05 según tarifa) + IVA descontable (24080201/221)
 *   Crédito : Proveedores (220501/221001) = base + IVA − retenciones
 *             + Retefuente + ReteICA + ReteIVA (las que GVM le practica al proveedor)
 * En una devolución (DMP) la naturaleza de cada regla viene invertida, así que el
 * mismo motor produce el asiento contrario sin lógica especial.
 *
 * Función PURA: no toca Supabase. Testeable con Vitest.
 */

export type PurchaseDocKind = 'CREM' | 'DMP';
export type PaymentForm = 'CONTADO' | 'CREDITO';
export type Nature = 'D' | 'C';

export type PurchaseConcept = 'INVENTARIO' | 'IVA' | 'PROVEEDORES' | 'RETEFUENTE' | 'RETEICA' | 'RETEIVA';

export interface PurchaseRule {
    iva_rate: number;
    account_code: string;
    nature: Nature;
    concept: PurchaseConcept;
}

export interface TaxRate { rate: number; min_base: number }
export interface TaxRates { RETEFUENTE?: TaxRate; RETEICA?: TaxRate; RETEIVA?: TaxRate }

export interface PurchaseLine { qty: number; unit_price: number; iva_rate: number }

export interface PurchaseDocument {
    doc_kind: PurchaseDocKind;
    payment_form: PaymentForm;
    taxpayer_code: string;
    lines: PurchaseLine[];
}

export interface JournalLineDraft {
    account_code: string;
    debit: number;
    credit: number;
    concept: PurchaseConcept;
    iva_rate: number | null;
}

export interface PurchaseResult {
    lines: JournalLineDraft[];
    totals: {
        base: number; iva: number; retefuente: number; reteica: number; reteiva: number;
        proveedores: number; debit: number; credit: number;
    };
    warnings: string[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

function split(amount: number, nature: Nature): { debit: number; credit: number } {
    const v = round2(amount);
    if (v < 0) return nature === 'D' ? { debit: 0, credit: -v } : { debit: -v, credit: 0 };
    return nature === 'D' ? { debit: v, credit: 0 } : { debit: 0, credit: v };
}

export function buildPurchaseEntry(
    doc: PurchaseDocument,
    rules: PurchaseRule[],
    taxes: TaxRates,
): PurchaseResult {
    const warnings: string[] = [];
    const lines: JournalLineDraft[] = [];
    const empty = { base: 0, iva: 0, retefuente: 0, reteica: 0, reteiva: 0, proveedores: 0, debit: 0, credit: 0 };

    if (rules.length === 0) {
        warnings.push(
            `Sin reglas contables para ${doc.doc_kind} / ${doc.payment_form} / ${doc.taxpayer_code}. ` +
            `Revisa la matriz de compras del contador o el tipo de contribuyente del proveedor.`,
        );
        return { lines, totals: empty, warnings };
    }

    // Bases por tarifa
    const baseByRate = new Map<number, number>();
    for (const l of doc.lines) {
        const amount = (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
        const rate = Number(l.iva_rate) || 0;
        baseByRate.set(rate, (baseByRate.get(rate) ?? 0) + amount);
    }
    if (baseByRate.size === 0) baseByRate.set(0, 0);

    let totalBase = 0, totalIva = 0;
    const ivaByRate = new Map<number, number>();
    for (const [rate, base] of baseByRate) {
        const iva = round2(base * (rate / 100));
        ivaByRate.set(rate, iva);
        totalBase += base; totalIva += iva;
    }
    totalBase = round2(totalBase); totalIva = round2(totalIva);

    const ruleFor = (concept: PurchaseConcept, rate?: number) =>
        rules.find(r => r.concept === concept && (rate === undefined || Number(r.iva_rate) === rate));

    // Inventario e IVA descontable, una línea por tarifa
    for (const [rate, base] of [...baseByRate.entries()].sort((a, b) => a[0] - b[0])) {
        const invRule = ruleFor('INVENTARIO', rate);
        if (!invRule) warnings.push(`No hay cuenta de inventario para la tarifa ${rate}% en ${doc.doc_kind}/${doc.payment_form}/${doc.taxpayer_code}.`);
        else lines.push({ account_code: invRule.account_code, ...split(base, invRule.nature), concept: 'INVENTARIO', iva_rate: rate });

        const iva = ivaByRate.get(rate) ?? 0;
        if (iva !== 0) {
            const ivaRule = ruleFor('IVA', rate);
            if (!ivaRule) warnings.push(`Hay IVA al ${rate}% pero no hay cuenta de IVA descontable para esa tarifa.`);
            else lines.push({ account_code: ivaRule.account_code, ...split(iva, ivaRule.nature), concept: 'IVA', iva_rate: rate });
        }
    }

    // Retenciones que GVM le practica al proveedor
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

    const emit = (concept: PurchaseConcept, amount: number) => {
        if (amount === 0) return;
        const rule = ruleFor(concept);
        if (!rule) return;
        lines.push({ account_code: rule.account_code, ...split(amount, rule.nature), concept, iva_rate: null });
    };
    emit('RETEFUENTE', retefuente);
    emit('RETEICA', reteica);
    emit('RETEIVA', reteiva);

    // Proveedores (neto a pagar)
    const proveedores = round2(totalBase + totalIva - retefuente - reteica - reteiva);
    const provRule = ruleFor('PROVEEDORES');
    if (!provRule) warnings.push(`No hay cuenta de proveedores para ${doc.doc_kind}/${doc.payment_form}/${doc.taxpayer_code}: el asiento quedaría descuadrado.`);
    else if (proveedores !== 0) lines.push({ account_code: provRule.account_code, ...split(proveedores, provRule.nature), concept: 'PROVEEDORES', iva_rate: null });

    // Cuadre: diferencias de centavos se ajustan contra proveedores
    let debit = round2(lines.reduce((s, l) => s + l.debit, 0));
    let credit = round2(lines.reduce((s, l) => s + l.credit, 0));
    const diff = round2(debit - credit);
    if (diff !== 0 && Math.abs(diff) <= 1) {
        const target = lines.find(l => l.concept === 'PROVEEDORES');
        if (target) {
            if (target.credit > 0) target.credit = round2(target.credit + diff);
            else target.debit = round2(target.debit - diff);
            debit = round2(lines.reduce((s, l) => s + l.debit, 0));
            credit = round2(lines.reduce((s, l) => s + l.credit, 0));
        }
    }
    if (round2(debit - credit) !== 0) warnings.push(`El asiento quedó descuadrado por ${round2(debit - credit)}. No se debe contabilizar así.`);

    return {
        lines,
        totals: { base: totalBase, iva: totalIva, retefuente, reteica, reteiva, proveedores, debit, credit },
        warnings,
    };
}
