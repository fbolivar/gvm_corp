import { describe, it, expect } from 'vitest';
import { statsBySalesperson, isOverdue, isFollowupDue, weekRange, monthRange, byMeetingType } from './visitStats';
import { buildSnapshot, classifyAccount } from './accountHealth';
import type { CrmVisit } from '../types/visits';

function visit(partial: Partial<CrmVisit>): CrmVisit {
    return {
        id: 'v', tenant_id: 't', salesperson_id: 'u1', salesperson_name: 'Duván Mira',
        party_id: 'p', party_name: 'Cliente', party_city: null, party_phone: null, party_email: null, party_contact: null, is_internal: false, title: null,
        priority: 2, management_type: 'FIDELIZACION', objective: 'x', meeting_type: 'GRANJA',
        planned_date: '2026-09-10', status: 'PENDIENTE', done_date: null, conclusions: null,
        commitments: null, next_followup_date: null, result: null, created_by: null,
        created_at: '', updated_at: '',
        ...partial,
    };
}

describe('visitStats', () => {
    it('cuenta por estado, % avance y cuentas críticas por comercial', () => {
        // Arrange
        const visits = [
            visit({ id: '1', status: 'REALIZADA', priority: 1 }),
            visit({ id: '2', status: 'AGENDADA' }),
            visit({ id: '3', status: 'PENDIENTE', priority: 1, is_internal: true, party_id: null, title: 'Oficina' }),
            visit({ id: '4', status: 'NO_REALIZADA' }),
            visit({ id: '5', salesperson_id: 'u2', salesperson_name: 'Carla Castro', status: 'REPROGRAMADA' }),
        ];

        // Act
        const stats = statsBySalesperson(visits, '2026-09-16');

        // Assert
        expect(stats.map(s => s.salesperson_name)).toEqual(['Carla Castro', 'Duván Mira']);
        const duvan = stats[1];
        expect(duvan.planned).toBe(4);
        expect(duvan.realizada).toBe(1);
        expect(duvan.agendada).toBe(1);
        expect(duvan.pendiente).toBe(1);
        expect(duvan.no_realizada).toBe(1);
        expect(duvan.progress_pct).toBe(25);
        // la interna de prioridad 1 no cuenta como cuenta crítica
        expect(duvan.critical_accounts).toBe(1);
    });

    it('marca vencidas las abiertas con fecha pasada y los seguimientos cumplidos', () => {
        const today = '2026-09-16';
        expect(isOverdue(visit({ status: 'PENDIENTE', planned_date: '2026-09-10' }), today)).toBe(true);
        expect(isOverdue(visit({ status: 'REALIZADA', planned_date: '2026-09-10' }), today)).toBe(false);
        expect(isOverdue(visit({ status: 'AGENDADA', planned_date: '2026-09-20' }), today)).toBe(false);
        expect(isFollowupDue(visit({ status: 'REALIZADA', next_followup_date: '2026-09-16' }), today)).toBe(true);
        expect(isFollowupDue(visit({ status: 'REALIZADA', next_followup_date: '2026-10-01' }), today)).toBe(false);
        expect(isFollowupDue(visit({ status: 'PENDIENTE', next_followup_date: '2026-09-01' }), today)).toBe(false);

        const stats = statsBySalesperson([
            visit({ status: 'PENDIENTE', planned_date: '2026-09-01' }),
            visit({ status: 'REALIZADA', next_followup_date: '2026-09-10' }),
            visit({ status: 'AGENDADA', planned_date: '2026-09-30' }),
        ], today);
        expect(stats[0].overdue_followups).toBe(2);
    });

    it('calcula la semana lunes-domingo sin depender de la zona horaria', () => {
        expect(weekRange('2026-09-16')).toEqual({ from: '2026-09-14', to: '2026-09-20' }); // miércoles
        expect(weekRange('2026-09-14')).toEqual({ from: '2026-09-14', to: '2026-09-20' }); // lunes
        expect(weekRange('2026-09-20')).toEqual({ from: '2026-09-14', to: '2026-09-20' }); // domingo
    });

    it('calcula el último día real del mes (septiembre tiene 30, febrero bisiesto 29)', () => {
        expect(monthRange('2026-09-16')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
        expect(monthRange('2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
        expect(monthRange('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    });

    it('agrupa por tipo de reunión', () => {
        const r = byMeetingType([visit({ meeting_type: 'GRANJA' }), visit({ meeting_type: 'GRANJA' }), visit({ meeting_type: 'VIRTUAL' })]);
        expect(r).toEqual({ GRANJA: 2, VIRTUAL: 1 });
    });
});

describe('accountHealth', () => {
    const today = '2026-09-16';

    it('clasifica el estado de la cuenta como la hoja BD CLIENTES', () => {
        expect(classifyAccount({ today, last_purchase_date: null, sales_ytd: 0, sales_prev_ytd: 0 })).toBe('SIN_HISTORIAL');
        expect(classifyAccount({ today, last_purchase_date: '2025-03-01', sales_ytd: 0, sales_prev_ytd: 5 })).toBe('INACTIVO_LARGO');
        expect(classifyAccount({ today, last_purchase_date: '2025-11-20', sales_ytd: 0, sales_prev_ytd: 5 })).toBe('INACTIVO_ANIO');
        expect(classifyAccount({ today, last_purchase_date: '2026-07-31', sales_ytd: 10, sales_prev_ytd: 5 })).toBe('SIN_COMPRA_MES');
        expect(classifyAccount({ today, last_purchase_date: '2026-09-02', sales_ytd: 4, sales_prev_ytd: 5 })).toBe('ACTIVO_CAIDA');
        expect(classifyAccount({ today, last_purchase_date: '2026-09-02', sales_ytd: 6, sales_prev_ytd: 5 })).toBe('ACTIVO_CRECIMIENTO');
        // sin base del año anterior, activo = crecimiento
        expect(classifyAccount({ today, last_purchase_date: '2026-09-02', sales_ytd: 6, sales_prev_ytd: 0 })).toBe('ACTIVO_CRECIMIENTO');
    });

    it('arma la ficha: YTD comparable, mes, última compra, producto principal y mayor caída', () => {
        // Arrange
        const sales = [
            { issue_date: '2026-02-10', total: 100 },
            { issue_date: '2026-09-05', total: 50 },
            { issue_date: '2026-11-01', total: 999 },   // futura: no cuenta en YTD
            { issue_date: '2025-03-10', total: 80 },
            { issue_date: '2025-09-20', total: 40 },
            { issue_date: '2025-10-01', total: 500 },   // fuera del período comparable
        ];
        const lines = [
            { issue_date: '2026-02-10', product_name: 'Vacuna A', line_total: 70 },
            { issue_date: '2026-02-10', product_name: 'Antibiótico B', line_total: 30 },
            { issue_date: '2026-09-05', product_name: 'Vacuna A', line_total: 50 },
            { issue_date: '2025-03-10', product_name: 'Antibiótico B', line_total: 80 },
            { issue_date: '2025-09-20', product_name: 'Vitamina C', line_total: 40 },
        ];

        // Act
        const snap = buildSnapshot('p1', today, sales, lines);

        // Assert
        expect(snap.sales_ytd).toBe(150);
        expect(snap.sales_prev_ytd).toBe(80);         // 2025-09-20 es posterior al 2025-09-16
        expect(snap.var_ytd_pct).toBe(87.5);
        expect(snap.sales_month).toBe(50);
        expect(snap.sales_prev_month).toBe(40);
        expect(snap.var_month_pct).toBe(25);
        expect(snap.orders_count_ytd).toBe(2);
        expect(snap.last_purchase_date).toBe('2026-11-01');
        expect(snap.top_product).toBe('Vacuna A');
        expect(snap.biggest_drop_product).toBe('Antibiótico B');   // 30 vs 80
        expect(snap.account_status).toBe('ACTIVO_CRECIMIENTO');
    });

    it('sin ventas devuelve ceros y sin historial', () => {
        const snap = buildSnapshot('p1', today, [], []);
        expect(snap.sales_ytd).toBe(0);
        expect(snap.var_ytd_pct).toBeNull();
        expect(snap.top_product).toBeNull();
        expect(snap.account_status).toBe('SIN_HISTORIAL');
    });
});
