export interface ODataQuery {
    top: number;
    skip: number;
    filter: Record<string, string>;
    select: string[];
    orderby: { field: string; direction: 'asc' | 'desc' }[];
    count: boolean;
}

export function parseODataParams(searchParams: URLSearchParams): ODataQuery {
    const top = Math.min(Number(searchParams.get('$top') || '100'), 1000);
    const skip = Number(searchParams.get('$skip') || '0');
    const count = searchParams.get('$count') === 'true';

    // Parse $select
    const selectRaw = searchParams.get('$select') || '';
    const select = selectRaw ? selectRaw.split(',').map(s => s.trim()) : [];

    // Parse $orderby
    const orderbyRaw = searchParams.get('$orderby') || '';
    const orderby = orderbyRaw
        ? orderbyRaw.split(',').map(part => {
            const [field, dir] = part.trim().split(/\s+/);
            return { field, direction: (dir?.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc' };
        })
        : [];

    // Parse $filter (basic: field eq 'value', field gt N, field lt N)
    const filterRaw = searchParams.get('$filter') || '';
    const filter: Record<string, string> = {};
    if (filterRaw) {
        const parts = filterRaw.split(/\s+and\s+/i);
        for (const part of parts) {
            const match = part.match(/(\w+)\s+(eq|ne|gt|ge|lt|le)\s+'?([^']*)'?/i);
            if (match) {
                const [, field, op, value] = match;
                filter[`${field}__${op}`] = value;
            }
        }
    }

    return { top, skip, filter, select, orderby, count };
}

export function applyODataFilter(query: unknown, filters: Record<string, string>): unknown {
    let q = query as Record<string, (field: string, value: string) => unknown>;
    for (const [key, value] of Object.entries(filters)) {
        const [field, op] = key.split('__');
        switch (op) {
            case 'eq': q = q.eq(field, value) as typeof q; break;
            case 'ne': q = q.neq(field, value) as typeof q; break;
            case 'gt': q = q.gt(field, value) as typeof q; break;
            case 'ge': q = q.gte(field, value) as typeof q; break;
            case 'lt': q = q.lt(field, value) as typeof q; break;
            case 'le': q = q.lte(field, value) as typeof q; break;
        }
    }
    return q;
}
