import { createClient } from '@/lib/supabase/client'

export type AttachmentDepartment = 'COMERCIAL' | 'CONTABLE'

export interface DocumentAttachment {
    id: string
    document_id: string
    tenant_id: string
    department: AttachmentDepartment
    file_name: string
    file_size: number | null
    mime_type: string | null
    storage_path: string
    created_by: string | null
    created_by_name: string | null
    created_at: string
    signed_url?: string
}

const BUCKET = 'documents'
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const URL_EXPIRY = 60 * 60 * 4   // 4 horas

export const documentAttachmentService = {
    async list(documentId: string): Promise<DocumentAttachment[]> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('document_attachments')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: true })
        if (error) throw error

        const rows = data ?? []
        const withUrls = await Promise.all(
            rows.map(async (att: DocumentAttachment) => {
                const { data: s } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(att.storage_path, URL_EXPIRY)
                return { ...att, signed_url: s?.signedUrl } as DocumentAttachment
            })
        )
        return withUrls
    },

    async upload(
        documentId: string,
        tenantId: string,
        department: AttachmentDepartment,
        file: File,
        uploaderName: string
    ): Promise<DocumentAttachment> {
        if (file.size > MAX_SIZE) throw new Error('El archivo no puede superar 20 MB')

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${tenantId}/doc-attachments/${documentId}/${department}/${Date.now()}-${safeName}`

        const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })
        if (upErr) throw upErr

        const { data: record, error: dbErr } = await supabase
            .from('document_attachments')
            .insert({
                document_id: documentId,
                department,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type || null,
                storage_path: path,
                created_by: user?.id ?? null,
                created_by_name: uploaderName,
            })
            .select()
            .single()

        if (dbErr) {
            await supabase.storage.from(BUCKET).remove([path])
            throw dbErr
        }

        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(path, URL_EXPIRY)
        return { ...record, signed_url: s?.signedUrl } as DocumentAttachment
    },

    async remove(attachment: DocumentAttachment): Promise<void> {
        const supabase = createClient()
        await supabase.from('document_attachments').delete().eq('id', attachment.id)
        await supabase.storage.from(BUCKET).remove([attachment.storage_path])
    },

    async getSignedUrl(storagePath: string): Promise<string | null> {
        const supabase = createClient()
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, URL_EXPIRY)
        return data?.signedUrl ?? null
    },
}
