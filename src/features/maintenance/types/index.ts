import { z } from 'zod';

export const EquipmentStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'RETIRED']);
export const MaintenanceTypeEnum = z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE']);
export const MaintenancePriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const MaintenanceStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export const equipmentSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    code: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    serial_number: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    status: EquipmentStatusEnum.default('ACTIVE'),
    purchase_date: z.string().optional().nullable(),
    last_maintenance_date: z.string().optional().nullable(),
    next_maintenance_date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().optional(),
});

export type Equipment = z.infer<typeof equipmentSchema>;

export const maintenanceOrderSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    equipment_id: z.string().uuid(),
    order_type: MaintenanceTypeEnum,
    priority: MaintenancePriorityEnum.default('MEDIUM'),
    status: MaintenanceStatusEnum.default('PENDING'),
    description: z.string().min(5),
    technician_name: z.string().optional().nullable(),
    scheduled_date: z.string(),
    completed_date: z.string().optional().nullable(),
    estimated_cost: z.number().optional().nullable(),
    actual_cost: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().optional(),
    equipment: equipmentSchema.optional(),
});

export type MaintenanceOrder = z.infer<typeof maintenanceOrderSchema>;

export const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
    LOW:      { label: 'Baja',    className: 'bg-slate-50 text-slate-500 border border-slate-100' },
    MEDIUM:   { label: 'Media',   className: 'bg-amber-50 text-amber-700 border border-amber-100' },
    HIGH:     { label: 'Alta',    className: 'bg-orange-50 text-orange-700 border border-orange-100' },
    CRITICAL: { label: 'Crítica', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
};

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    PENDING:     { label: 'Pendiente',  className: 'bg-amber-50 text-amber-700 border border-amber-100' },
    IN_PROGRESS: { label: 'En Proceso', className: 'bg-blue-50 text-blue-700 border border-blue-100' },
    COMPLETED:   { label: 'Completada', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    CANCELLED:   { label: 'Cancelada',  className: 'bg-slate-50 text-slate-400 border border-slate-100' },
};

export const TYPE_LABELS: Record<string, string> = {
    PREVENTIVE: 'Preventivo',
    CORRECTIVE: 'Correctivo',
    PREDICTIVE: 'Predictivo',
};
