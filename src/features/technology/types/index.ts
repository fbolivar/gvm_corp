import { z } from 'zod';

// ── Enums ──
export const IT_ASSET_CATEGORIES = ['DESKTOP', 'LAPTOP', 'MOBILE', 'TABLET', 'PRINTER', 'NETWORK', 'OTHER'] as const;
export const IT_ASSET_STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'] as const;
export const IT_ASSET_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR'] as const;
export const IT_MAINTENANCE_TYPES = ['PREVENTIVE', 'CORRECTIVE'] as const;
export const IT_MAINTENANCE_STATUSES = ['SCHEDULED', 'COMPLETED', 'OVERDUE'] as const;

export type ITAssetCategory = (typeof IT_ASSET_CATEGORIES)[number];
export type ITAssetStatus = (typeof IT_ASSET_STATUSES)[number];
export type ITAssetCondition = (typeof IT_ASSET_CONDITIONS)[number];
export type ITMaintenanceType = (typeof IT_MAINTENANCE_TYPES)[number];
export type ITMaintenanceStatus = (typeof IT_MAINTENANCE_STATUSES)[number];

// ── Interfaces ──
export interface ITAsset {
    id: string;
    tenant_id: string;
    asset_code: string;
    name: string;
    category: ITAssetCategory;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    purchase_date: string | null;
    purchase_cost: number;
    warranty_expiry: string | null;
    status: ITAssetStatus;
    condition: ITAssetCondition;
    specs: Record<string, string>;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // joined
    current_assignment?: ITAssetAssignment | null;
}

export interface ITAssetAssignment {
    id: string;
    tenant_id: string;
    asset_id: string;
    employee_id: string;
    assigned_at: string;
    assigned_by: string | null;
    returned_at: string | null;
    return_condition: ITAssetCondition | null;
    delivery_notes: string | null;
    return_notes: string | null;
    created_at: string;
    // joined
    employee?: { id: string; party: { legal_name: string } | null } | null;
    assigned_by_profile?: { full_name: string } | null;
}

export interface ITMaintenanceSchedule {
    id: string;
    tenant_id: string;
    asset_id: string;
    maintenance_type: ITMaintenanceType;
    frequency_days: number;
    last_performed_at: string | null;
    next_due_at: string;
    performed_by: string | null;
    notes: string | null;
    status: ITMaintenanceStatus;
    created_at: string;
    updated_at: string;
}

// ── Zod Schemas ──
export const createAssetSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    category: z.enum(IT_ASSET_CATEGORIES),
    brand: z.string().optional(),
    model: z.string().optional(),
    serial_number: z.string().optional(),
    purchase_date: z.string().optional(),
    purchase_cost: z.coerce.number().min(0).default(0),
    warranty_expiry: z.string().optional(),
    condition: z.enum(IT_ASSET_CONDITIONS).default('NEW'),
    specs: z.record(z.string(), z.string()).default({}),
    notes: z.string().optional(),
});

export const assignAssetSchema = z.object({
    asset_id: z.string().uuid(),
    employee_id: z.string().uuid('Debe seleccionar un empleado'),
    delivery_notes: z.string().optional(),
});

export const returnAssetSchema = z.object({
    assignment_id: z.string().uuid(),
    return_condition: z.enum(IT_ASSET_CONDITIONS),
    return_notes: z.string().optional(),
});

export const createMaintenanceSchema = z.object({
    asset_id: z.string().uuid(),
    maintenance_type: z.enum(IT_MAINTENANCE_TYPES).default('PREVENTIVE'),
    frequency_days: z.coerce.number().int().min(1).default(180),
    next_due_at: z.string().min(1, 'La fecha es requerida'),
    notes: z.string().optional(),
});

// ── Label helpers ──
export const CATEGORY_LABELS: Record<ITAssetCategory, string> = {
    DESKTOP: 'Escritorio',
    LAPTOP: 'Portátil',
    MOBILE: 'Celular',
    TABLET: 'Tablet',
    PRINTER: 'Impresora',
    NETWORK: 'Red',
    OTHER: 'Otro',
};

export const STATUS_LABELS: Record<ITAssetStatus, string> = {
    AVAILABLE: 'Disponible',
    ASSIGNED: 'Asignado',
    IN_MAINTENANCE: 'En Mantenimiento',
    RETIRED: 'Retirado',
    LOST: 'Extraviado',
};

export const CONDITION_LABELS: Record<ITAssetCondition, string> = {
    NEW: 'Nuevo',
    GOOD: 'Bueno',
    FAIR: 'Regular',
    POOR: 'Malo',
};
