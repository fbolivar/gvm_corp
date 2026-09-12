/**
 * Trae TODAS las filas de una consulta, paginando.
 *
 * Por qué existe: PostgREST corta cualquier respuesta en 1.000 filas (tope
 * `max-rows` del proyecto) y lo hace EN SILENCIO — no hay error, solo llegan
 * menos filas. Un `.limit(5000)` no sirve de nada: se ignora. Los síntomas son
 * datos que "no existen" (un cliente del final del alfabeto que no aparece en
 * el buscador), totales que salen bajos y copias de seguridad incompletas.
 *
 * El callback recibe el rango y devuelve la respuesta de Supabase tal cual.
 * Quien llama debe ordenar por una columna ÚNICA (normalmente `id`, o el
 * criterio de negocio más `id` como desempate): sin un orden total determinista
 * `range()` puede saltarse o repetir filas entre páginas.
 *
 *   const filas = await fetchAllRows(({ from, to }) =>
 *       db.from('documents').select('*').eq('tenant_id', t).order('id').range(from, to)
 *   )
 */

const DEFAULT_PAGE_SIZE = 1000;

/** Tope duro de seguridad: evita un bucle infinito si el backend repite página. */
const MAX_PAGES = 1000;

export interface FetchAllOptions {
    /** Filas por página. No subir de 1.000: PostgREST no devuelve más. */
    pageSize?: number;
    /** Etiqueta para los mensajes de error en consola. */
    label?: string;
}

/** Respuesta de Supabase. `PromiseLike` porque el query builder es "thenable", no una Promise. */
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAllRows<T>(
    fetchPage: (range: { from: number; to: number }) => PageResult<T>,
    options: FetchAllOptions = {},
): Promise<T[]> {
    const pageSize = Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const label = options.label ?? 'fetchAllRows';

    const all: T[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error } = await fetchPage({ from: offset, to: offset + pageSize - 1 });

        if (error) {
            // Se devuelve lo acumulado en vez de romper la pantalla, pero el
            // error queda registrado: un resultado parcial silencioso es
            // exactamente lo que este helper existe para evitar.
            console.error(`[${label}] página desde ${offset}:`, error.message);
            break;
        }
        if (!data || data.length === 0) break;

        all.push(...data);

        // Página incompleta = última página.
        if (data.length < pageSize) break;
        offset += pageSize;
    }

    return all;
}
