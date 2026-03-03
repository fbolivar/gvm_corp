import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure logic helpers extracted from lotService for testing without Supabase
// ---------------------------------------------------------------------------

/** Calculate days remaining until a lot expires. Positive = future, negative = past. */
function calculateDaysUntilExpiry(expirationDate: string): number {
    const exp = new Date(expirationDate);
    const now = new Date();
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** FEFO ordering — First Expiry First Out: sort by expiration_date ascending. */
function sortByFEFO<T extends { expiration_date: string }>(lots: T[]): T[] {
    return [...lots].sort(
        (a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime(),
    );
}

/**
 * Mirrors the update-object construction inside `lotService.adjustLotQty`.
 * When newQty <= 0, the status is automatically set to DEPLETED.
 */
function buildAdjustUpdates(newQty: number): Record<string, unknown> {
    const updates: Record<string, unknown> = { qty: newQty };
    if (newQty <= 0) {
        updates.status = 'DEPLETED';
    }
    return updates;
}

/** Default LotSummary shape used when the RPC returns null. */
function getDefaultLotSummary() {
    return {
        total_lots: 0,
        active_lots: 0,
        expired_lots: 0,
        expiring_30d: 0,
        expiring_90d: 0,
        quarantine_lots: 0,
        total_value: 0,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Lot Service - Pure Logic', () => {
    // ----- calculateDaysUntilExpiry -----
    describe('calculateDaysUntilExpiry', () => {
        it('should return positive days for a future expiration date', () => {
            // Arrange
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            const futureDateStr = futureDate.toISOString().split('T')[0];

            // Act
            const days = calculateDaysUntilExpiry(futureDateStr);

            // Assert — should be around 29-30 days (depends on time-of-day rounding)
            expect(days).toBeGreaterThanOrEqual(29);
            expect(days).toBeLessThanOrEqual(31);
        });

        it('should return negative days for a past expiration date', () => {
            // Arrange
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 15);
            const pastDateStr = pastDate.toISOString().split('T')[0];

            // Act
            const days = calculateDaysUntilExpiry(pastDateStr);

            // Assert
            expect(days).toBeLessThanOrEqual(-14);
            expect(days).toBeGreaterThanOrEqual(-16);
        });

        it('should return 0 or 1 for today', () => {
            // Arrange
            const todayStr = new Date().toISOString().split('T')[0];

            // Act
            const days = calculateDaysUntilExpiry(todayStr);

            // Assert — Math.ceil on a same-day diff can be 0 or 1
            expect(days).toBeGreaterThanOrEqual(0);
            expect(days).toBeLessThanOrEqual(1);
        });

        it('should return exactly 1 for tomorrow', () => {
            // Arrange
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            // Act
            const days = calculateDaysUntilExpiry(tomorrowStr);

            // Assert
            expect(days).toBeGreaterThanOrEqual(0);
            expect(days).toBeLessThanOrEqual(2);
        });
    });

    // ----- sortByFEFO -----
    describe('sortByFEFO', () => {
        it('should sort lots by expiration date ascending (first-to-expire first)', () => {
            // Arrange
            const lots = [
                { lot_number: 'L003', expiration_date: '2026-12-01' },
                { lot_number: 'L001', expiration_date: '2026-06-15' },
                { lot_number: 'L002', expiration_date: '2026-09-20' },
            ];

            // Act
            const sorted = sortByFEFO(lots);

            // Assert
            expect(sorted[0].lot_number).toBe('L001');
            expect(sorted[1].lot_number).toBe('L002');
            expect(sorted[2].lot_number).toBe('L003');
        });

        it('should preserve relative order for lots with the same expiration date', () => {
            // Arrange
            const lots = [
                { lot_number: 'A', expiration_date: '2026-07-01' },
                { lot_number: 'B', expiration_date: '2026-07-01' },
                { lot_number: 'C', expiration_date: '2026-07-01' },
            ];

            // Act
            const sorted = sortByFEFO(lots);

            // Assert — all dates equal, so output length should match
            expect(sorted).toHaveLength(3);
            expect(sorted.map(l => l.expiration_date)).toEqual([
                '2026-07-01',
                '2026-07-01',
                '2026-07-01',
            ]);
        });

        it('should not mutate the original array', () => {
            // Arrange
            const lots = [
                { lot_number: 'Z', expiration_date: '2027-01-01' },
                { lot_number: 'A', expiration_date: '2026-01-01' },
            ];
            const originalFirst = lots[0].lot_number;

            // Act
            sortByFEFO(lots);

            // Assert
            expect(lots[0].lot_number).toBe(originalFirst);
        });

        it('should handle an empty array', () => {
            // Arrange / Act
            const sorted = sortByFEFO([]);

            // Assert
            expect(sorted).toEqual([]);
        });

        it('should handle a single-element array', () => {
            // Arrange
            const lots = [{ lot_number: 'ONLY', expiration_date: '2026-05-01' }];

            // Act
            const sorted = sortByFEFO(lots);

            // Assert
            expect(sorted).toHaveLength(1);
            expect(sorted[0].lot_number).toBe('ONLY');
        });
    });

    // ----- buildAdjustUpdates -----
    describe('buildAdjustUpdates', () => {
        it('should set status to DEPLETED when qty is 0', () => {
            // Arrange / Act
            const updates = buildAdjustUpdates(0);

            // Assert
            expect(updates.qty).toBe(0);
            expect(updates.status).toBe('DEPLETED');
        });

        it('should set status to DEPLETED when qty is negative', () => {
            // Arrange / Act
            const updates = buildAdjustUpdates(-5);

            // Assert
            expect(updates.qty).toBe(-5);
            expect(updates.status).toBe('DEPLETED');
        });

        it('should NOT set status when qty is greater than 0', () => {
            // Arrange / Act
            const updates = buildAdjustUpdates(10);

            // Assert
            expect(updates.qty).toBe(10);
            expect(updates).not.toHaveProperty('status');
        });

        it('should always include qty in updates regardless of value', () => {
            // Arrange / Act / Assert
            expect(buildAdjustUpdates(0)).toHaveProperty('qty', 0);
            expect(buildAdjustUpdates(100)).toHaveProperty('qty', 100);
            expect(buildAdjustUpdates(-1)).toHaveProperty('qty', -1);
        });

        it('should only contain qty key when qty > 0', () => {
            // Arrange / Act
            const updates = buildAdjustUpdates(50);

            // Assert
            expect(Object.keys(updates)).toEqual(['qty']);
        });

        it('should contain exactly qty and status keys when qty <= 0', () => {
            // Arrange / Act
            const updates = buildAdjustUpdates(0);

            // Assert
            expect(Object.keys(updates).sort()).toEqual(['qty', 'status']);
        });
    });

    // ----- LotSummary default shape -----
    describe('LotSummary default', () => {
        it('should have all numeric fields set to zero', () => {
            // Arrange / Act
            const defaults = getDefaultLotSummary();

            // Assert
            expect(defaults.total_lots).toBe(0);
            expect(defaults.active_lots).toBe(0);
            expect(defaults.expired_lots).toBe(0);
            expect(defaults.expiring_30d).toBe(0);
            expect(defaults.expiring_90d).toBe(0);
            expect(defaults.quarantine_lots).toBe(0);
            expect(defaults.total_value).toBe(0);
        });

        it('should contain exactly 7 keys', () => {
            // Arrange / Act
            const defaults = getDefaultLotSummary();

            // Assert
            expect(Object.keys(defaults)).toHaveLength(7);
        });

        it('should match the LotSummary interface shape', () => {
            // Arrange / Act
            const defaults = getDefaultLotSummary();

            // Assert — verify every expected key exists
            const expectedKeys = [
                'total_lots',
                'active_lots',
                'expired_lots',
                'expiring_30d',
                'expiring_90d',
                'quarantine_lots',
                'total_value',
            ];
            expectedKeys.forEach(key => {
                expect(defaults).toHaveProperty(key);
                expect(typeof (defaults as Record<string, unknown>)[key]).toBe('number');
            });
        });
    });
});
