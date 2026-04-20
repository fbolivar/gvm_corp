import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Ruta legacy — redirige a la nueva vista de impresión sin layout.
export default async function DeliveryNoteLegacy({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const { id } = await searchParams;
    redirect(id ? `/print/delivery-note?id=${id}` : '/documents');
}
