import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { DocumentDetail } from '@/features/documents/components/DocumentDetail';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
    const { id } = await params; // Next.js 15+ params are promises? Or just wait for safety if async is used in newer versions
    const supabase = await createClient();

    try {
        const document = await documentService.getDocumentById(supabase, id);
        const relatedDocs = await documentService.getRelatedDocuments(supabase, id, document.parent_id);

        return (
            <div className="container mx-auto py-6">
                <DocumentDetail document={document} relatedDocuments={relatedDocs} />
            </div>
        );
    } catch (error) {
        notFound();
    }
}
