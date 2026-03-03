import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure logic helpers extracted from dashboardService for testing without Supabase
// ---------------------------------------------------------------------------

/**
 * Calculate percentage trend between two periods.
 * Mirrors the trend calculation used on the dashboard KPI cards.
 *   - previous = 0 and current > 0  =>  100%
 *   - both = 0                       =>  0%
 *   - otherwise standard % change with one decimal precision
 */
function calcTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/**
 * Classify an invoice into an AR aging bucket based on its due date.
 * Mirrors the aging logic inside dashboardService.getKPIs.
 *   diffDays <= 0  => 'current'
 *   diffDays 1-30  => 'overdue30'
 *   diffDays 31-60 => 'overdue60'
 *   diffDays > 60  => 'overdue90'
 */
function classifyAgingBucket(
    dueDate: string,
    now: Date = new Date(),
): 'current' | 'overdue30' | 'overdue60' | 'overdue90' {
    const due = new Date(dueDate);
    const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 0) return 'current';
    if (diffDays <= 30) return 'overdue30';
    if (diffDays <= 60) return 'overdue60';
    return 'overdue90';
}

/**
 * Return the top N products sorted by total descending.
 * Mirrors the topProducts sorting in dashboardService.getKPIs (lines 129-131).
 */
function getTopProducts(
    products: Array<{ name: string; total: number }>,
    limit: number = 5,
): Array<{ name: string; total: number }> {
    return [...products].sort((a, b) => b.total - a.total).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard Service - Pure Logic', () => {
    // ----- calcTrend -----
    describe('calcTrend', () => {
        it('should return 100 when previous is 0 and current is positive', () => {
            // Arrange / Act
            const trend = calcTrend(500, 0);

            // Assert
            expect(trend).toBe(100);
        });

        it('should return 0 when both current and previous are 0', () => {
            // Arrange / Act
            const trend = calcTrend(0, 0);

            // Assert
            expect(trend).toBe(0);
        });

        it('should return positive trend for growth (200 from 100 = 100%)', () => {
            // Arrange / Act
            const trend = calcTrend(200, 100);

            // Assert
            expect(trend).toBe(100);
        });

        it('should return negative trend for decline (50 from 100 = -50%)', () => {
            // Arrange / Act
            const trend = calcTrend(50, 100);

            // Assert
            expect(trend).toBe(-50);
        });

        it('should handle decimal precision correctly', () => {
            // Arrange — 333 from 1000 = -66.7%
            // Act
            const trend = calcTrend(333, 1000);

            // Assert
            expect(trend).toBe(-66.7);
        });

        it('should return 100 when previous is 0 and current is very small', () => {
            // Arrange / Act
            const trend = calcTrend(0.01, 0);

            // Assert
            expect(trend).toBe(100);
        });

        it('should return 0 when current equals previous (no change)', () => {
            // Arrange / Act
            const trend = calcTrend(500, 500);

            // Assert
            expect(trend).toBe(0);
        });

        it('should handle large numbers without overflow', () => {
            // Arrange / Act
            const trend = calcTrend(2_000_000, 1_000_000);

            // Assert
            expect(trend).toBe(100);
        });

        it('should handle negative current value (losses)', () => {
            // Arrange — current = -100, previous = 200 => ((−100−200)/200)*100 = −150
            // Act
            const trend = calcTrend(-100, 200);

            // Assert
            expect(trend).toBe(-150);
        });
    });

    // ----- classifyAgingBucket -----
    describe('classifyAgingBucket', () => {
        // Fix a reference date so tests are deterministic
        const referenceDate = new Date('2026-03-03T12:00:00Z');

        it('should classify a future due date as current', () => {
            // Arrange — due date is 10 days in the future
            const dueDate = '2026-03-13';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('current');
        });

        it('should classify today due date as current (diffDays = 0)', () => {
            // Arrange
            const dueDate = '2026-03-03';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('current');
        });

        it('should classify 1 day overdue as overdue30', () => {
            // Arrange — due date was yesterday
            const dueDate = '2026-03-02';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue30');
        });

        it('should classify 15 days overdue as overdue30', () => {
            // Arrange — 15 days before reference
            const dueDate = '2026-02-16';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue30');
        });

        it('should classify 30 days overdue as overdue30 (boundary)', () => {
            // Arrange — exactly 30 days overdue
            const dueDate = '2026-02-01';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue30');
        });

        it('should classify 31 days overdue as overdue60', () => {
            // Arrange — 31 days before reference
            const dueDate = '2026-01-31';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue60');
        });

        it('should classify 45 days overdue as overdue60', () => {
            // Arrange — 45 days before reference => Jan 17
            const dueDate = '2026-01-17';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue60');
        });

        it('should classify 60 days overdue as overdue60 (boundary)', () => {
            // Arrange — exactly 60 days before reference => Jan 2
            const dueDate = '2026-01-02';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue60');
        });

        it('should classify 61 days overdue as overdue90', () => {
            // Arrange — 61 days before reference => Jan 1
            const dueDate = '2026-01-01';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue90');
        });

        it('should classify 100 days overdue as overdue90', () => {
            // Arrange — 100 days before reference => Nov 24, 2025
            const dueDate = '2025-11-24';

            // Act
            const bucket = classifyAgingBucket(dueDate, referenceDate);

            // Assert
            expect(bucket).toBe('overdue90');
        });
    });

    // ----- getTopProducts -----
    describe('getTopProducts', () => {
        it('should return top N products sorted by total descending', () => {
            // Arrange
            const products = [
                { name: 'Widget A', total: 100 },
                { name: 'Widget B', total: 500 },
                { name: 'Widget C', total: 300 },
                { name: 'Widget D', total: 200 },
                { name: 'Widget E', total: 400 },
                { name: 'Widget F', total: 50 },
            ];

            // Act
            const top3 = getTopProducts(products, 3);

            // Assert
            expect(top3).toHaveLength(3);
            expect(top3[0].name).toBe('Widget B');
            expect(top3[0].total).toBe(500);
            expect(top3[1].name).toBe('Widget E');
            expect(top3[1].total).toBe(400);
            expect(top3[2].name).toBe('Widget C');
            expect(top3[2].total).toBe(300);
        });

        it('should return all products when list is smaller than limit', () => {
            // Arrange
            const products = [
                { name: 'A', total: 10 },
                { name: 'B', total: 20 },
            ];

            // Act
            const result = getTopProducts(products, 5);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('B');
            expect(result[1].name).toBe('A');
        });

        it('should handle empty array gracefully', () => {
            // Arrange / Act
            const result = getTopProducts([], 5);

            // Assert
            expect(result).toEqual([]);
        });

        it('should default to top 5 when no limit is specified', () => {
            // Arrange
            const products = Array.from({ length: 10 }, (_, i) => ({
                name: `Product ${i}`,
                total: (i + 1) * 100,
            }));

            // Act
            const result = getTopProducts(products);

            // Assert
            expect(result).toHaveLength(5);
            expect(result[0].total).toBe(1000); // Product 9
            expect(result[4].total).toBe(600);  // Product 5
        });

        it('should not mutate the original array', () => {
            // Arrange
            const products = [
                { name: 'Low', total: 10 },
                { name: 'High', total: 999 },
            ];
            const originalFirstName = products[0].name;

            // Act
            getTopProducts(products, 1);

            // Assert
            expect(products[0].name).toBe(originalFirstName);
        });

        it('should handle products with identical totals', () => {
            // Arrange
            const products = [
                { name: 'A', total: 100 },
                { name: 'B', total: 100 },
                { name: 'C', total: 100 },
            ];

            // Act
            const result = getTopProducts(products, 2);

            // Assert
            expect(result).toHaveLength(2);
            // All have same total, so any 2 are valid
            result.forEach(p => expect(p.total).toBe(100));
        });

        it('should handle products with zero totals', () => {
            // Arrange
            const products = [
                { name: 'Zero1', total: 0 },
                { name: 'Zero2', total: 0 },
                { name: 'HasSales', total: 50 },
            ];

            // Act
            const result = getTopProducts(products, 5);

            // Assert
            expect(result[0].name).toBe('HasSales');
            expect(result[0].total).toBe(50);
        });
    });
});
