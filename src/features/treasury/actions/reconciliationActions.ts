'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ParsedBankLine } from '../services/bankFileParser'

/**
 * Conciliación bancaria: importar el extracto del banco y cruzarlo contra el
 * libro auxiliar (los movimientos registrados en tesorería).
 */

export interface ImportResult {
    ok: boolean;
    statementId?: string;
    lineas?: number;
    error?: string;
}

/** Crea el extracto con las líneas leídas del archivo del banco. */
export async function importBankStatementAction(input: {
    accountId: string;
    startDate: string;
    endDate: string;
    openingBalance: number;
    closingBalance: number;
    lines: ParsedBankLine[];
}): Promise<ImportResult> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

        if (input.lines.length === 0) return { ok: false, error: 'El archivo no tiene movimientos que importar.' }

        const { data: ut } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle()
        if (!ut) return { ok: false, error: 'No se pudo determinar la empresa del usuario.' }

        const { data: stmt, error: stmtError } = await supabase
            .from('bank_statements')
            .insert({
                tenant_id: ut.tenant_id,
                account_id: input.accountId,
                start_date: input.startDate,
                end_date: input.endDate,
                opening_balance: input.openingBalance,
                closing_balance: input.closingBalance,
                status: 'DRAFT',
                created_by: user.id,
            })
            .select('id')
            .single()

        if (stmtError || !stmt) return { ok: false, error: `No se pudo crear el extracto: ${stmtError?.message ?? ''}` }

        const payload = input.lines.map(l => ({
            tenant_id: ut.tenant_id,
            statement_id: stmt.id,
            date: l.date,
            description: l.reference ? `${l.description} · Ref ${l.reference}` : l.description,
            amount: l.amount,
            status: 'UNMATCHED',
        }))

        const { error: linesError } = await supabase.from('bank_statement_lines').insert(payload)
        if (linesError) {
            // Sin líneas el extracto no sirve: se elimina para no dejar basura.
            await supabase.from('bank_statements').delete().eq('id', stmt.id)
            return { ok: false, error: `No se pudieron guardar los movimientos: ${linesError.message}` }
        }

        revalidatePath('/treasury/reconcile')
        return { ok: true, statementId: stmt.id, lineas: payload.length }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado al importar el extracto.' }
    }
}

export interface AutoMatchResult {
    ok: boolean;
    cruzadas: number;
    ambiguas: number;
    sinCoincidencia: number;
    error?: string;
}

/**
 * Cruce automático contra el libro auxiliar.
 *
 * Empareja por valor exacto y fecha cercana, y SOLO cuando hay un único
 * candidato: si hay varios movimientos que calzan, se deja para revisión
 * manual en vez de adivinar.
 */
export async function autoMatchStatementAction(
    statementId: string,
    toleranceDays = 5
): Promise<AutoMatchResult> {
    const base: AutoMatchResult = { ok: false, cruzadas: 0, ambiguas: 0, sinCoincidencia: 0 }
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { ...base, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

        const { data: stmt } = await supabase
            .from('bank_statements')
            .select('id, account_id, start_date, end_date')
            .eq('id', statementId)
            .maybeSingle()
        if (!stmt) return { ...base, error: 'Extracto no encontrado.' }

        const { data: lines } = await supabase
            .from('bank_statement_lines')
            .select('id, date, amount, status')
            .eq('statement_id', statementId)
            .neq('status', 'MATCHED')

        if (!lines || lines.length === 0) return { ...base, ok: true }

        // Movimientos del libro auxiliar de esa cuenta, con holgura de fechas.
        const desde = new Date(stmt.start_date); desde.setDate(desde.getDate() - toleranceDays)
        const hasta = new Date(stmt.end_date); hasta.setDate(hasta.getDate() + toleranceDays)

        const { data: txs } = await supabase
            .from('treasury_transactions')
            .select('id, date, amount, is_reconciled')
            .eq('account_id', stmt.account_id)
            .eq('is_reconciled', false)
            .gte('date', desde.toISOString().slice(0, 10))
            .lte('date', hasta.toISOString().slice(0, 10))

        const disponibles = [...(txs ?? [])]
        let cruzadas = 0, ambiguas = 0, sinCoincidencia = 0

        for (const line of lines) {
            const objetivo = Math.abs(Number(line.amount) || 0)
            const fechaLinea = new Date(line.date).getTime()

            const candidatos = disponibles.filter(t => {
                if (Math.abs(Math.abs(Number(t.amount) || 0) - objetivo) > 0.01) return false
                const dias = Math.abs(new Date(t.date).getTime() - fechaLinea) / 86400000
                return dias <= toleranceDays
            })

            if (candidatos.length === 0) { sinCoincidencia++; continue }
            if (candidatos.length > 1) { ambiguas++; continue }

            const tx = candidatos[0]
            const { error: e1 } = await supabase
                .from('bank_statement_lines')
                .update({ transaction_id: tx.id, status: 'MATCHED' })
                .eq('id', line.id)
            if (e1) { sinCoincidencia++; continue }

            await supabase
                .from('treasury_transactions')
                .update({ is_reconciled: true, reconciled_at: new Date().toISOString() })
                .eq('id', tx.id)

            // Un movimiento del libro no puede cruzarse dos veces.
            disponibles.splice(disponibles.indexOf(tx), 1)
            cruzadas++
        }

        revalidatePath(`/treasury/reconcile/${stmt.account_id}/match/${statementId}`)
        return { ok: true, cruzadas, ambiguas, sinCoincidencia }
    } catch (e) {
        return { ...base, error: e instanceof Error ? e.message : 'Error inesperado en el cruce automático.' }
    }
}

export interface DifferencesResult {
    soloBanco: Array<{ id: string; date: string; description: string; amount: number }>;
    soloLibro: Array<{ id: string; date: string; description: string; amount: number }>;
    error?: string;
}

/**
 * Partidas conciliatorias: lo que está en el extracto y no en el libro, y lo
 * que está en el libro y no aparece en el extracto. Es el reporte que pide
 * revisoría después de cruzar.
 */
export async function getReconciliationDifferencesAction(statementId: string): Promise<DifferencesResult> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { soloBanco: [], soloLibro: [], error: 'Sesión expirada.' }

        const { data: stmt } = await supabase
            .from('bank_statements')
            .select('id, account_id, start_date, end_date')
            .eq('id', statementId)
            .maybeSingle()
        if (!stmt) return { soloBanco: [], soloLibro: [], error: 'Extracto no encontrado.' }

        const { data: pendientes } = await supabase
            .from('bank_statement_lines')
            .select('id, date, description, amount')
            .eq('statement_id', statementId)
            .neq('status', 'MATCHED')
            .order('date')

        const { data: libro } = await supabase
            .from('treasury_transactions')
            .select('id, date, description, amount')
            .eq('account_id', stmt.account_id)
            .eq('is_reconciled', false)
            .gte('date', stmt.start_date)
            .lte('date', stmt.end_date)
            .order('date')

        return {
            soloBanco: (pendientes ?? []).map(l => ({
                id: l.id as string, date: l.date as string,
                description: (l.description as string) ?? '', amount: Number(l.amount) || 0,
            })),
            soloLibro: (libro ?? []).map(t => ({
                id: t.id as string, date: t.date as string,
                description: (t.description as string) ?? '', amount: Number(t.amount) || 0,
            })),
        }
    } catch (e) {
        return { soloBanco: [], soloLibro: [], error: e instanceof Error ? e.message : 'Error inesperado.' }
    }
}
