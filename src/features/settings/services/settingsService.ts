import { SupabaseClient } from '@supabase/supabase-js';

export interface TeamMember {
    id: string;
    user_id: string;
    role: string;
    role_id?: string;
    zone_id?: string;
    role_name?: string;
    zone_name?: string;
    status: string;
    created_at: string;
    email: string;
    full_name: string;
}

export interface AppRole {
    id: string;
    name: string;
    description?: string;
}

export interface AppModule {
    id: string;
    key: string;
    name: string;
    icon?: string;
}

export interface RolePermission {
    role_id: string;
    module_key: string;
    can_view: boolean;
    can_edit: boolean;
}

export interface Zone {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
}

export interface TenantInfo {
    id: string;
    name: string;
    nit: string;
    dv: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    department?: string;
    country?: string;
    logo_url?: string;
    website?: string;
    created_at: string;
    updated_at?: string;
    mail_config?: any;
}

export interface DianResolution {
    id: string;
    tenant_id: string;
    resolution_number: string;
    prefix: string | null;
    start_range: number;
    end_range: number;
    current_number: number;
    start_date: string;
    end_date: string;
    technical_key?: string | null;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export const settingsService = {
    async getUserTenants(supabase: SupabaseClient, userId: string) {
        const { data, error } = await supabase
            .from('user_tenants')
            .select('tenant_id, tenants(id, name)')
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    },

    async getTenantInfo(supabase: SupabaseClient, tenantId?: string): Promise<TenantInfo | null> {
        let query = supabase.from('tenants').select('*');

        if (tenantId) {
            query = query.eq('id', tenantId);
        }

        const { data, error } = await query.single();
        if (error) return null; // Handle gracefully if not found
        return data;
    },

    async updateTenantInfo(supabase: SupabaseClient, id: string, updates: Partial<TenantInfo>) {
        const { data, error } = await supabase
            .from('tenants')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getDianConfig(supabase: SupabaseClient) {
        const { data, error } = await supabase
            .from('dian_config')
            .select('*')
            .maybeSingle();

        if (error) {
            console.error('Error fetching DIAN config:', error);
            return null;
        }
        return data;
    },

    async updateDianConfig(supabase: SupabaseClient, tenantId: string, updates: Record<string, unknown>) {
        const { data, error } = await supabase
            .from('dian_config')
            .upsert({ tenant_id: tenantId, ...updates })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getUserProfile(supabase: SupabaseClient) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            role: user.user_metadata?.role || 'user',
            notifications: user.user_metadata?.notifications || {
                email_invoices: true,
                email_low_stock: true,
                email_security: true,
                app_invoices: true,
                app_low_stock: true,
                app_security: true
            }
        };
    },

    async updateUserProfile(supabase: SupabaseClient, updates: Record<string, unknown>) {
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });

        if (error) throw error;
        return data.user;
    },

    async updateNotificationSettings(supabase: SupabaseClient, notifications: Record<string, boolean>) {
        const { data, error } = await supabase.auth.updateUser({
            data: { notifications }
        });

        if (error) throw error;
        return data.user;
    },

    // ==========================================
    // Team Management
    // ==========================================

    async getTeamMembers(supabase: SupabaseClient): Promise<TeamMember[]> {
        // First get tenant id
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .single();

        if (!tenant) return [];

        // Use RPC to get members with user details
        const { data, error } = await supabase
            .rpc('get_team_members', { p_tenant_id: tenant.id });

        if (error) throw error;
        return data || [];
    },

    async inviteTeamMember(supabase: SupabaseClient, email: string, role: string) {
        // Use Supabase admin invite (generates magic link)
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

        if (inviteError) {
            // If user already exists, try to add them to tenant
            if (inviteError.message.includes('already')) {
                // Get user by email lookup
                const { data: existingUsers } = await supabase
                    .from('user_tenants')
                    .select('user_id')
                    .limit(1);

                throw new Error('El usuario ya está registrado. Use su ID para agregarlo al equipo.');
            }
            throw inviteError;
        }

        // Get tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .single();

        if (!tenant || !inviteData.user) throw new Error('No se pudo obtener información del tenant');

        // Add to user_tenants
        const { error: linkError } = await supabase
            .from('user_tenants')
            .insert({
                tenant_id: tenant.id,
                user_id: inviteData.user.id,
                role,
                status: 'invited'
            });

        if (linkError) throw linkError;

        return inviteData.user;
    },

    async addExistingUserToTeam(supabase: SupabaseClient, email: string, role: string, zoneId?: string) {
        // Get tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .single();

        if (!tenant) throw new Error('No se pudo obtener el tenant');

        // We need an RPC to find user by email since we can't query auth.users directly from client
        // For now, we use a server-side approach
        const { data, error } = await supabase.rpc('add_user_to_tenant_by_email', {
            p_email: email,
            p_tenant_id: tenant.id,
            p_role: role,
            p_zone_id: zoneId || null
        });

        if (error) throw error;
        return data;
    },

    async updateTeamMemberRole(supabase: SupabaseClient, membershipId: string, role: string) {
        const { data, error } = await supabase.rpc('update_team_member_role', {
            p_membership_id: membershipId,
            p_new_role: role
        });

        if (error) throw error;
        return data;
    },

    async updateTeamMemberZone(supabase: SupabaseClient, membershipId: string, zoneId: string | null) {
        const { data, error } = await supabase.rpc('update_team_member_zone', {
            p_membership_id: membershipId,
            p_new_zone_id: zoneId
        });

        if (error) throw error;
        return data;
    },


    async removeTeamMember(supabase: SupabaseClient, membershipId: string) {
        const { error } = await supabase.rpc('remove_team_member', {
            p_membership_id: membershipId
        });

        if (error) throw error;
    },

    // ==========================================
    // Audit Logs
    // ==========================================

    async getAuditLogs(supabase: SupabaseClient) {
        // First get tenant id
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .single();

        if (!tenant) return [];

        const { data, error } = await supabase
            .rpc('get_audit_logs_with_users', { p_tenant_id: tenant.id });

        if (error) throw error;

        return data;
    },

    // ==========================================
    // DIAN Resolutions
    // ==========================================

    async getResolutions(supabase: SupabaseClient, tenantId: string): Promise<DianResolution[]> {
        const { data, error } = await supabase
            .from('dian_resolutions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async upsertResolution(supabase: SupabaseClient, resolution: Partial<DianResolution>) {
        const { error } = await supabase
            .from('dian_resolutions')
            .upsert(resolution);

        if (error) throw error;
    },

    async deleteResolution(supabase: SupabaseClient, id: string) {
        const { error } = await supabase
            .from('dian_resolutions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateMailConfig(supabase: SupabaseClient, tenantId: string, config: any) {
        const { error } = await supabase
            .from('tenants')
            .update({ mail_config: config, updated_at: new Date().toISOString() })
            .eq('id', tenantId);

        if (error) throw error;
    },

    async uploadTenantLogo(supabase: SupabaseClient, tenantId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${tenantId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('tenant-assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('tenant-assets')
            .getPublicUrl(filePath);

        await this.updateTenantInfo(supabase, tenantId, { logo_url: publicUrl });
        return publicUrl;
    },

    async uploadAvatar(supabase: SupabaseClient, userId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar-${userId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('tenant-assets')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('tenant-assets')
            .getPublicUrl(filePath);

        // Actualizar user_metadata + profiles
        await this.updateUserProfile(supabase, { avatar_url: publicUrl });
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);

        return publicUrl;
    },

    // ==========================================
    // Governance & Zones
    // ==========================================

    async getAppRoles(supabase: SupabaseClient): Promise<AppRole[]> {
        const { data, error } = await supabase
            .from('app_roles')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async getAppModules(supabase: SupabaseClient): Promise<AppModule[]> {
        const { data, error } = await supabase
            .from('app_modules')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async getRolePermissions(supabase: SupabaseClient): Promise<RolePermission[]> {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('*');
        if (error) throw error;
        return data || [];
    },

    async updateRolePermission(supabase: SupabaseClient, role_id: string, module_key: string, can_view: boolean) {
        // Usamos RPC con SECURITY DEFINER para bypasear las restricciones RLS
        // La función upsert_role_permission existe en la migración 20260226150000
        const { error } = await supabase.rpc('upsert_role_permission', {
            p_role_id: role_id,
            p_module_key: module_key,
            p_can_view: can_view
        });
        if (error) {
            // Fallback: intento directo si la RPC no existe aún
            const { error: upsertError } = await supabase
                .from('role_permissions')
                .upsert({ role_id, module_key, can_view, can_edit: can_view }, { onConflict: 'role_id,module_key' });
            if (upsertError) throw upsertError;
        }
    },

    async getZones(supabase: SupabaseClient): Promise<Zone[]> {
        const { data, error } = await supabase
            .from('zones')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createZone(supabase: SupabaseClient, tenantId: string, name: string) {
        const { data, error } = await supabase
            .from('zones')
            .insert({ tenant_id: tenantId, name })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteZone(supabase: SupabaseClient, zoneId: string) {
        const { error } = await supabase
            .from('zones')
            .delete()
            .eq('id', zoneId);
        if (error) throw error;
    }
};
