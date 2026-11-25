import { z } from 'zod';

/** Umbrales configurables de los KPIs (una fila por tenant en crm_kpi_settings). */
export interface KpiSettings {
    visit_green_pct: number;
    visit_amber_pct: number;
    client_passive_days: number;
    client_inactive_days: number;
    growth_pct: number;
    drop_pct: number;
}

export const DEFAULT_KPI_SETTINGS: KpiSettings = {
    visit_green_pct: 90,
    visit_amber_pct: 70,
    client_passive_days: 45,
    client_inactive_days: 90,
    growth_pct: 15,
    drop_pct: 30,
};

export const kpiSettingsSchema = z.object({
    visit_green_pct: z.coerce.number().int().min(1).max(100),
    visit_amber_pct: z.coerce.number().int().min(0).max(100),
    client_passive_days: z.coerce.number().int().min(1).max(3650),
    client_inactive_days: z.coerce.number().int().min(1).max(3650),
    growth_pct: z.coerce.number().int().min(1).max(500),
    drop_pct: z.coerce.number().int().min(1).max(100),
}).refine(v => v.visit_green_pct >= v.visit_amber_pct, { message: 'El umbral verde debe ser ≥ al amarillo', path: ['visit_green_pct'] })
    .refine(v => v.client_inactive_days >= v.client_passive_days, { message: 'Los días de "inactivo" deben ser ≥ a los de "pasivo"', path: ['client_inactive_days'] });
export type KpiSettingsInput = z.input<typeof kpiSettingsSchema>;

/** Categorías de cliente (derivadas de pedidos reales con los umbrales de arriba). */
export const CLIENT_CATEGORIES = {
    EN_CRECIMIENTO: 'Activo en crecimiento',
    ACTIVO: 'Activo',
    EN_CAIDA: 'Activo en caída',
    PASIVO: 'Pasivo (sin compra reciente)',
    INACTIVO: 'Inactivo',
    POTENCIAL: 'Potencial / sin historial',
} as const;
export type ClientCategory = keyof typeof CLIENT_CATEGORIES;

export const CLIENT_CATEGORY_STYLE: Record<ClientCategory, { dot: string; text: string; bg: string }> = {
    EN_CRECIMIENTO: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    ACTIVO: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
    EN_CAIDA: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    PASIVO: { dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
    INACTIVO: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
    POTENCIAL: { dot: 'bg-sky-400', text: 'text-sky-700', bg: 'bg-sky-50' },
};

export type Semaphore = 'green' | 'amber' | 'red';

export const SEMAPHORE_STYLE: Record<Semaphore, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-rose-500',
};

/** KPI de cumplimiento por comercial. */
export interface SalespersonKpi {
    salesperson_id: string;
    salesperson_name: string;
    planned: number;
    realizada: number;
    no_realizada: number;
    reprogramada: number;
    pendiente: number;
    overdue: number;
    critical: number;
    /** Realizadas ÷ planeadas (0-100). */
    compliance_pct: number;
    semaphore: Semaphore;
    /** Meta de visitas del período (crm_sales_targets); null si no hay. */
    target_visits: number | null;
    /** Realizadas ÷ meta (%); null si no hay meta. */
    target_pct: number | null;
}
