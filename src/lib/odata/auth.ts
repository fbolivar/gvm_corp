import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function validateApiKey(
    request: Request
): Promise<{ valid: boolean; tenantId?: string; error?: string }> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return { valid: false, error: 'Missing Authorization header' };

    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) return { valid: false, error: 'Empty API key' };

    // Use service role to check API keys table (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Look up key by prefix (first 8 chars)
    const prefix = apiKey.substring(0, 8);

    const { data: keyRecord, error } = await adminClient
        .from('api_keys')
        .select('id, tenant_id, is_active, scopes, key_hash')
        .eq('prefix', prefix)
        .eq('is_active', true)
        .maybeSingle();

    if (error || !keyRecord) return { valid: false, error: 'Invalid API key' };

    // Hash the provided key and compare against stored hash
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

    if (hash !== keyRecord.key_hash) return { valid: false, error: 'Invalid API key' };

    // Check scopes include 'read'
    if (!keyRecord.scopes?.includes('read')) return { valid: false, error: 'Insufficient permissions' };

    // Update last_used_at
    await adminClient
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id);

    return { valid: true, tenantId: keyRecord.tenant_id };
}
