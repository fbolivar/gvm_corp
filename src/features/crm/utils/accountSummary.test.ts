import { describe, it, expect } from 'vitest';
import { summarizeAccounts, deriveAlerts, attainment, prevMonthKey, daysInMonth } from './accountSummary';

const today = '2026-09-16';
const parties = [
    { id: 'a', legal_name: 'Granja A', city: 'Bogotá', salesperson_id: 'u1' },
    { id: 'b', legal_name: 'Granja B', city: null, salesperson_id: 'u1' },
    { id: 'c', legal_name: 'Granja C', city: null, salesperson_id: null },
    { id: 'd', legal_name: 'Granja D', city: null, salesperson_id: 'u2' },
];
const orders = [
    { party_id: 'a', issue_date: '2026-08-10', total: 1_000_000 },   // ventana anterior (19 jul – 17 ago)
    { party_id: 'a', issue_date: '2026-09-05', total: 500_000 },     // últimos 30 días (18 ago – 16 sep): cayó 50 %
    { party_id: 'b', issue_date: '2026-07-20', total: 300 },     // 58 días sin comprar
    { party_id: 'd', issue_date: '2026-09-15', total: 200 },     // al día
];

describe('summarizeAccounts', () => {
    it('resume ventas del mes, mes anterior, acumulado, última compra y estado', () => {
        // Act
        const [a, b, c, d] = summarizeAccounts(parties, orders, today);

        // Assert
        expect(a.sales_month).toBe(500_000);
        expect(a.sales_prev_month).toBe(1_000_000);
        expect(a.sales_ytd).toBe(1_500_000);
        expect(a.sales_30d).toBe(500_000);
        expect(a.sales_prev_30d).toBe(1_000_000);
        expect(a.var_30d_pct).toBe(-50);
        expect(a.account_status).toBe('ACTIVO_CAIDA');
        expect(b.days_since_purchase).toBe(58);
        expect(b.account_status).toBe('SIN_COMPRA_MES');
        expect(c.orders_count).toBe(0);
        expect(c.account_status).toBe('SIN_HISTORIAL');
        expect(d.account_status).toBe('ACTIVO_CRECIMIENTO');
        expect(d.days_since_purchase).toBe(1);
    });

    it('prevMonthKey cruza el año', () => {
        expect(prevMonthKey('2026-01-10')).toBe('2025-12');
        expect(prevMonthKey('2026-09-16')).toBe('2026-08');
    });
});

describe('deriveAlerts', () => {
    it('genera caída y sin compra, ignora quien nunca compró, ordena por peso', () => {
        const alerts = deriveAlerts(summarizeAccounts(parties, orders, today));
        expect(alerts.map(x => [x.account.id, x.kind])).toEqual([['a', 'EN_CAIDA'], ['b', 'SIN_COMPRA']]);
        expect(alerts[0].suggested_management).toBe('RECUPERACION');
        expect(alerts[1].reason).toBe('58 días sin comprar');
    });

    it('no marca caída si la base anterior es pequeña (ruido de compras chicas)', () => {
        const small = [
            { party_id: 'a', issue_date: '2026-08-10', total: 100_000 },
            { party_id: 'a', issue_date: '2026-09-05', total: 10_000 },
        ];
        expect(deriveAlerts(summarizeAccounts(parties.slice(0, 1), small, today))).toEqual([]);
    });
});

describe('attainment', () => {
    it('calcula ritmo esperado, proyección y estado', () => {
        // 16 de 30 días = 53 % esperado
        const r = attainment(3_000_000, 1_600_000, '2026-09', today);
        expect(r.expected_pct).toBe(53);
        expect(r.attainment_pct).toBe(53.3);
        expect(r.status).toBe('AL_DIA');
        expect(r.projected).toBe(3_000_000);

        expect(attainment(3_000_000, 2_400_000, '2026-09', today).status).toBe('ADELANTE');
        expect(attainment(3_000_000, 600_000, '2026-09', today).status).toBe('ATRASADO');
        expect(attainment(0, 600_000, '2026-09', today).status).toBe('SIN_META');
    });

    it('un mes cerrado se evalúa al 100 % y uno futuro al 0 %', () => {
        expect(attainment(100, 80, '2026-08', today).expected_pct).toBe(100);
        expect(attainment(100, 80, '2026-08', today).status).toBe('ATRASADO');
        expect(attainment(100, 0, '2026-10', today).expected_pct).toBe(0);
        expect(daysInMonth('2028-02')).toBe(29);
    });
});
