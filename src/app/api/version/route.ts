import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Versión del deploy que está sirviendo AHORA.
 * El cliente la compara con la que cargó su pestaña para avisar de una versión
 * nueva antes de que una Server Action vieja falle ("was not found on the server").
 */
export async function GET() {
    return NextResponse.json(
        { id: process.env.NEXT_PUBLIC_APP_BUILD || 'dev' },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
}
