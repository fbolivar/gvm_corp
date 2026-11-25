import { describe, it, expect } from 'vitest';
import { semaphoreFor, classifyClient, classificationCounts, salespersonKpis } from './visitKpi';
import { DEFAULT_KPI_SETTINGS } from '../types/kpi';
import type { CrmVisit } from '../types/visits';

const S = DEFAULT_KPI_SETTINGS; // green 90, amber 70, passive 45, inactive 90, growth 15, drop 30

describe('semaphoreFor', () => {
    it('verde en el umbral y por encima', () => {
        expect(semaphoreFor(90, S)).toBe('green');
        expect(semaphoreFor(100, S)).toBe('green');
    });
    it('amarillo entre amber y green', () => {
        expect(semaphoreFor(70, S)).toBe('amber');
        expect(semaphoreFor(89, S)).toBe('amber');
    });
    it('rojo por debajo del amber', () => {
        expect(semaphoreFor(69, S)).toBe('red');
        expect(semaphoreFor(0, S)).toBe('red');
    });
});

describe('classifyClient', () => {
    it('potencial si nunca compró', () => {
        expect(classifyClient({ orders_count: 0, days_since_purchase: null, var_30d_pct: null }, S)).toBe('POTENCIAL');
    });
    it('inactivo manda sobre pasivo', () => {
        expect(classifyClient({ orders_count: 3, days_since_purchase: 120, var_30d_pct: null }, S)).toBe('INACTIVO');
    });
    it('pasivo entre passive e inactive', () => {
        expect(classifyClient({ orders_count: 3, days_since_purchase: 60, var_30d_pct: null }, S)).toBe('PASIVO');
    });
    it('en caída si var ≤ -drop', () => {
        expect(classifyClient({ orders_count: 5, days_since_purchase: 10, var_30d_pct: -40 }, S)).toBe('EN_CAIDA');
    });
    it('en crecimiento si var ≥ growth', () => {
        expect(classifyClient({ orders_count: 5, days_since_purchase: 10, var_30d_pct: 25 }, S)).toBe('EN_CRECIMIENTO');
    });
    it('activo estable', () => {
        expect(classifyClient({ orders_count: 5, days_since_purchase: 10, var_30d_pct: 2 }, S)).toBe('ACTIVO');
    });
});

describe('classificationCounts', () => {
    it('cuenta todas las categorías', () => {
        const c = classificationCounts([
            { orders_count: 0, days_since_purchase: null, var_30d_pct: null },
            { orders_count: 1, days_since_purchase: 200, var_30d_pct: null },
            { orders_count: 1, days_since_purchase: 10, var_30d_pct: 50 },
        ], S);
        expect(c.POTENCIAL).toBe(1);
        expect(c.INACTIVO).toBe(1);
        expect(c.EN_CRECIMIENTO).toBe(1);
        expect(c.ACTIVO).toBe(0);
    });
});

describe('salespersonKpis', () => {
    const v = (over: Partial<CrmVisit>): CrmVisit => ({
        id: Math.random().toString(), tenant_id: 't', salesperson_id: 'a', party_id: 'p',
        is_internal: false, title: null, priority: 2, management_type: 'FIDELIZACION',
        objective: 'x', meeting_type: 'OFICINA', planned_date: '2026-11-10', status: 'REALIZADA',
        done_date: null, conclusions: null, commitments: null, next_followup_date: null, result: null,
        created_by: null, created_at: '', updated_at: '',
        salesperson_name: '', party_name: null, party_city: null, party_phone: null, party_email: null, party_contact: null,
        ...over,
    });

    it('incluye a todo el equipo aunque no tenga visitas', () => {
        const rows = salespersonKpis([], [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }], new Map(), S, '2026-11-25');
        expect(rows).toHaveLength(2);
        expect(rows.every(r => r.planned === 0 && r.compliance_pct === 0)).toBe(true);
    });

    it('cumplimiento = realizadas/planeadas y semáforo', () => {
        const visits = [v({ salesperson_id: 'a', status: 'REALIZADA' }), v({ salesperson_id: 'a', status: 'REALIZADA' }), v({ salesperson_id: 'a', status: 'PENDIENTE' })];
        const rows = salespersonKpis(visits, [{ id: 'a', name: 'Ana' }], new Map(), S, '2026-11-25');
        const ana = rows.find(r => r.salesperson_id === 'a')!;
        expect(ana.planned).toBe(3);
        expect(ana.realizada).toBe(2);
        expect(ana.compliance_pct).toBe(67);
        expect(ana.semaphore).toBe('red');
    });

    it('avance vs meta cuando hay target', () => {
        const visits = [v({ salesperson_id: 'a', status: 'REALIZADA' }), v({ salesperson_id: 'a', status: 'REALIZADA' })];
        const rows = salespersonKpis(visits, [{ id: 'a', name: 'Ana' }], new Map([['a', 4]]), S, '2026-11-25');
        const ana = rows.find(r => r.salesperson_id === 'a')!;
        expect(ana.target_visits).toBe(4);
        expect(ana.target_pct).toBe(50);
    });
});
