import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([], { status: 401 });

    const { data, error } = await supabase
        .from('price_list_items')
        .select('*, product:products(name, sku)')
        .eq('price_list_id', id)
        .order('min_qty', { ascending: true });

    if (error) {
        console.error('[api/pricing/items] GET error:', error.message);
        return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json(data ?? []);
}
