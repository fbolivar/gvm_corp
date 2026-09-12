import { describe, test, expect, vi } from 'vitest';
import { fetchAllRows } from './fetchAllRows';

/** Simula un backend que corta cada respuesta en 1.000 filas, como PostgREST. */
function fakeBackend(totalRows: number, cap = 1000) {
    const rows = Array.from({ length: totalRows }, (_, i) => ({ id: i }));
    return vi.fn(async ({ from, to }: { from: number; to: number }) => {
        const size = Math.min(to - from + 1, cap);
        return { data: rows.slice(from, from + size), error: null };
    });
}

describe('fetchAllRows', () => {
    test('trae todas las filas cuando hay más del tope de 1.000', async () => {
        // Arrange: 6.712 terceros, el caso real que dejaba invisibles a los
        // clientes del final del alfabeto.
        const backend = fakeBackend(6712);

        // Act
        const rows = await fetchAllRows(backend);

        // Assert
        expect(rows).toHaveLength(6712);
        expect(backend).toHaveBeenCalledTimes(7);
    });

    test('una sola página cuando caben todas', async () => {
        const backend = fakeBackend(42);
        const rows = await fetchAllRows(backend);
        expect(rows).toHaveLength(42);
        expect(backend).toHaveBeenCalledTimes(1);
    });

    test('tabla vacía devuelve lista vacía sin pedir más páginas', async () => {
        const backend = fakeBackend(0);
        expect(await fetchAllRows(backend)).toEqual([]);
        expect(backend).toHaveBeenCalledTimes(1);
    });

    test('un total múltiplo exacto del tamaño de página no pierde ni repite filas', async () => {
        const backend = fakeBackend(2000);
        const rows = await fetchAllRows<{ id: number }>(backend);
        expect(rows).toHaveLength(2000);
        expect(new Set(rows.map(r => r.id)).size).toBe(2000);
    });

    test('un error a mitad devuelve lo acumulado y lo reporta', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const backend = vi.fn(async ({ from }: { from: number; to: number }) => {
            if (from === 0) return { data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null };
            return { data: null, error: { message: 'timeout' } };
        });

        const rows = await fetchAllRows(backend, { label: 'prueba' });

        expect(rows).toHaveLength(1000);
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    test('el tamaño de página nunca supera el tope del backend', async () => {
        const backend = fakeBackend(1500);
        await fetchAllRows(backend, { pageSize: 5000 });
        const firstCall = backend.mock.calls[0][0];
        expect(firstCall.to - firstCall.from + 1).toBe(1000);
    });
});
