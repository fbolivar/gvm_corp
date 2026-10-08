'use server';

import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPortfolios } from './services/forecastHistoryService';

type Result = { success?: true; error?: string; value?: number };

async function managerCtx() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' as const };
    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) return { error: 'Tenant no encontrado' as const };
    const { data: isMgr } = await supabase.rpc('is_purchasing_manager');
    if (isMgr !== true) return { error: 'No tienes permiso de edición sobre Compras' as const };
    return { supabase, user, tenantId: tenant.id as string };
}

const openSchema = z.object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
});

/** Abre un período mensual y genera una línea por producto de cada comercial (sugerido = promedio, con ABC). */
export async function openForecastPeriodAction(input: unknown): Promise<Result> {
    const ctx = await managerCtx();
    if ('error' in ctx) return { error: ctx.error };
    const parsed = openSchema.safeParse(input);
    if (!parsed.success) return { error: 'Año o mes inválidos' };
    const { supabase, user, tenantId } = ctx;
    const { year, month } = parsed.data;

    const { data: existing } = await supabase
        .from('forecast_periods').select('id').eq('year', year).eq('month', month).maybeSingle();
    if (existing) return { error: 'Ya existe un período de pronóstico para ese mes' };

    const portfolios = await getPortfolios(supabase);
    if (portfolios.length === 0) return { error: 'No hay histórico importado; sube primero el informe de ventas' };

    const { data: period, error: perErr } = await supabase
        .from('forecast_periods')
        .insert({ tenant_id: tenantId, year, month, opened_by: user.id })
        .select('id').single();
    if (perErr || !period) return { error: 'No se pudo abrir el período' };

    const lines = portfolios.flatMap(p => p.products.map(prod => ({
        tenant_id: tenantId,
        period_id: period.id,
        salesperson_id: p.salespersonId,
        salesperson_label: p.salespersonLabel,
        sku: prod.sku,
        product_label: prod.productLabel,
        product_id: prod.productId,
        abc_class: prod.abc,
        suggested_qty: prod.avgQty,
        forecast_qty: prod.avgQty,   // arranca en el sugerido; el comercial ajusta
    })));

    const BATCH = 500;
    for (let i = 0; i < lines.length; i += BATCH) {
        const { error } = await supabase.from('forecast_lines').insert(lines.slice(i, i + BATCH));
        if (error) {
            await supabase.from('forecast_periods').delete().eq('id', period.id);
            return { error: 'No se pudieron generar las líneas del período' };
        }
    }

    revalidatePath('/purchasing/forecast');
    return { success: true, value: lines.length };
}

export async function closeForecastPeriodAction(periodId: unknown): Promise<Result> {
    const ctx = await managerCtx();
    if ('error' in ctx) return { error: ctx.error };
    const parsed = z.string().uuid().safeParse(periodId);
    if (!parsed.success) return { error: 'Período inválido' };
    const { error } = await ctx.supabase
        .from('forecast_periods').update({ status: 'CLOSED' }).eq('id', parsed.data).eq('status', 'OPEN');
    if (error) return { error: 'No se pudo cerrar el período' };
    revalidatePath('/purchasing/forecast');
    return { success: true };
}

export async function reopenForecastPeriodAction(periodId: unknown): Promise<Result> {
    const ctx = await managerCtx();
    if ('error' in ctx) return { error: ctx.error };
    const parsed = z.string().uuid().safeParse(periodId);
    if (!parsed.success) return { error: 'Período inválido' };
    const { error } = await ctx.supabase
        .from('forecast_periods').update({ status: 'OPEN' }).eq('id', parsed.data).eq('status', 'CLOSED');
    if (error) return { error: 'No se pudo reabrir el período' };
    revalidatePath('/purchasing/forecast');
    return { success: true };
}

const aliasSchema = z.object({
    reportLabel: z.string().min(1).max(200),
    salespersonId: z.string().uuid().nullable(),
    isSeparate: z.boolean(),
});

/**
 * Enlaza un vendedor del informe con un usuario del sistema (o lo deja sin dueño)
 * y define si va "aparte" en el consolidado. Solo gestión de Compras.
 */
export async function updateSalespersonAliasAction(input: unknown): Promise<Result> {
    const ctx = await managerCtx();
    if ('error' in ctx) return { error: ctx.error };
    const parsed = aliasSchema.safeParse(input);
    if (!parsed.success) return { error: 'Datos inválidos' };
    const { reportLabel, salespersonId, isSeparate } = parsed.data;
    const { supabase, tenantId } = ctx;

    // El usuario asignado debe pertenecer a este tenant (no aceptar ids de fuera).
    if (salespersonId) {
        const { data: member } = await supabase
            .from('user_tenants').select('user_id').eq('tenant_id', tenantId).eq('user_id', salespersonId).maybeSingle();
        if (!member) return { error: 'La persona seleccionada no pertenece a la empresa' };
    }

    const { error } = await supabase
        .from('forecast_salesperson_aliases')
        .update({ salesperson_id: salespersonId, is_separate: isSeparate })
        .eq('tenant_id', tenantId).eq('report_label', reportLabel);
    if (error) return { error: 'No se pudo guardar el enlace del vendedor' };

    revalidatePath('/purchasing/forecast');
    return { success: true };
}

const submitSchema = z.object({
    lineId: z.string().uuid(),
    qty: z.number().min(0).max(1e9),
    isOneOff: z.boolean(),
    note: z.string().max(500).optional().nullable(),
});

/** El comercial (o un gestor) ajusta una línea de su pronóstico. */
export async function submitForecastLineAction(input: unknown): Promise<Result> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) return { error: 'Datos inválidos' };
    const { error } = await supabase.rpc('submit_forecast_line', {
        p_line: parsed.data.lineId,
        p_qty: parsed.data.qty,
        p_one_off: parsed.data.isOneOff,
        p_note: parsed.data.note ?? null,
    });
    if (error) {
        const m = error.message || '';
        if (m.includes('cerrado')) return { error: 'El período de pronóstico está cerrado' };
        if (m.includes('tu línea') || m.includes('no encontrada')) return { error: 'No puedes editar esta línea' };
        return { error: 'No se pudo guardar el pronóstico' };
    }
    revalidatePath('/purchasing/forecast');
    return { success: true };
}
