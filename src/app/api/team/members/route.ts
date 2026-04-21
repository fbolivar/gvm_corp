import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { translateAuthError } from '@/shared/lib/auth-errors';

export async function POST(request: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('[API /team/members] auth error:', authError.message);
            return NextResponse.json({ error: `Error de autenticación: ${authError.message}` }, { status: 401 });
        }
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // 2. Admin check
        const { data: userTenant, error: tenantError } = await supabase
            .from('user_tenants')
            .select('role, tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (tenantError) {
            console.error('[API /team/members] tenant lookup error:', tenantError.message);
            return NextResponse.json({ error: `Error buscando tenant: ${tenantError.message}` }, { status: 500 });
        }

        const adminRoles = ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner'];
        if (!userTenant || !adminRoles.includes(userTenant.role)) {
            console.error('[API /team/members] forbidden — role:', userTenant?.role);
            return NextResponse.json({ error: `Sin permisos de administrador (rol: ${userTenant?.role || 'sin tenant'})` }, { status: 403 });
        }

        // 3. Parse body (manual validation — no Zod to avoid subtle rejections)
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
        }

        // debug: [API /team/members] body received:', JSON.stringify(body));

        const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const rawUsername = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        const role = typeof body.role === 'string' ? body.role.trim() : '';
        const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
        const zoneId = typeof body.zoneId === 'string' && body.zoneId.length > 0 ? body.zoneId : null;
        const rawPassword = typeof body.password === 'string' ? body.password.trim() : '';

        if (!role) {
            return NextResponse.json({ error: 'El rol es requerido' }, { status: 400 });
        }
        if (!rawEmail && !rawUsername) {
            return NextResponse.json({ error: 'Debes indicar un usuario o un email' }, { status: 400 });
        }
        if (rawUsername && !/^[a-z0-9._-]{3,30}$/.test(rawUsername)) {
            return NextResponse.json({ error: 'Usuario inválido: 3-30 caracteres, solo letras, números, punto, guion y guion bajo' }, { status: 400 });
        }

        // Si no hay email, se genera uno sintético a partir del username para que
        // Supabase Auth pueda crearlo. El usuario final entra con `username`.
        const email = rawEmail || `${rawUsername}@users.gvm.local`;
        const username = rawUsername || null;

        if (!email.includes('@')) {
            return NextResponse.json({ error: `Email inválido: "${email}"` }, { status: 400 });
        }

        const password = rawPassword.length >= 6 ? rawPassword : undefined;
        const tenantId = userTenant.tenant_id;
        const displayName = fullName || rawUsername || email.split('@')[0];

        // 4. Lookup role_id from app_roles
        const { data: appRole } = await supabase
            .from('app_roles')
            .select('id')
            .eq('name', role)
            .maybeSingle();

        // debug: [API /team/members] role lookup:', role, '→ appRole:', appRole?.id || 'NOT FOUND');

        // 5. Admin client for privileged operations
        const adminClient = createAdminClient();
        const finalPassword = password || crypto.randomUUID().slice(0, 12) + 'Ax1!';

        let targetUserId: string;
        let isNewUser = false;

        // Try to create user first
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password: finalPassword,
            email_confirm: true,
            user_metadata: { full_name: displayName, role }
        });

        if (createError) {
            // debug: [API /team/members] createUser failed:', createError.message, '— status:', createError.status);

            // If user already exists, find and link
            const isAlreadyExists =
                createError.message?.toLowerCase().includes('already') ||
                createError.message?.toLowerCase().includes('existe') ||
                createError.message?.toLowerCase().includes('duplicate') ||
                createError.status === 422;

            if (isAlreadyExists) {
                // debug: [API /team/members] User already exists, searching...');

                // Search existing user by email
                const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
                    page: 1,
                    perPage: 1000,
                });

                if (listError) {
                    console.error('[API /team/members] listUsers error:', listError.message);
                    return NextResponse.json({ error: `Error listando usuarios: ${listError.message}` }, { status: 500 });
                }

                const existingUser = listData?.users?.find(u => u.email === email);

                if (!existingUser) {
                    console.error('[API /team/members] User not found after "already exists":', email);
                    return NextResponse.json({
                        error: `Usuario ${email} reportado como existente pero no encontrado. Intente de nuevo.`
                    }, { status: 500 });
                }

                targetUserId = existingUser.id;
                // debug: [API /team/members] Found existing user:', targetUserId);

                // Update password if provided
                if (password) {
                    await adminClient.auth.admin.updateUserById(targetUserId, { password });
                }

                // Ensure profile exists (preserva username existente si no se envía nuevo)
                const profilePayload: Record<string, unknown> = {
                    id: targetUserId,
                    email,
                    full_name: fullName || existingUser.user_metadata?.full_name || displayName,
                };
                if (username) profilePayload.username = username;

                const { error: profileErr } = await adminClient
                    .from('profiles')
                    .upsert(profilePayload, { onConflict: 'id' });

                if (profileErr) {
                    console.error('[API /team/members] profile upsert error:', profileErr.message);
                    if (profileErr.message?.toLowerCase().includes('unique') && username) {
                        return NextResponse.json({ error: `El usuario "${username}" ya está en uso` }, { status: 409 });
                    }
                }
            } else {
                console.error('[API /team/members] createUser unexpected error:', createError.message);
                return NextResponse.json({ error: `Error creando usuario: ${createError.message}` }, { status: 500 });
            }
        } else {
            if (!newUser.user) {
                return NextResponse.json({ error: 'createUser retornó vacío' }, { status: 500 });
            }

            targetUserId = newUser.user.id;
            isNewUser = true;
            // debug: [API /team/members] New user created:', targetUserId);

            // Create profile con username si se envió
            const profilePayload: Record<string, unknown> = {
                id: targetUserId,
                email,
                full_name: displayName,
            };
            if (username) profilePayload.username = username;

            const { error: profileErr } = await adminClient
                .from('profiles')
                .upsert(profilePayload, { onConflict: 'id' });

            if (profileErr) {
                console.error('[API /team/members] profile upsert error:', profileErr.message);
                if (profileErr.message?.toLowerCase().includes('unique') && username) {
                    // Rollback: eliminar user auth recién creado para no dejarlo huérfano
                    await adminClient.auth.admin.deleteUser(targetUserId).catch(() => {});
                    return NextResponse.json({ error: `El usuario "${username}" ya está en uso` }, { status: 409 });
                }
            }
        }

        // 6. Link user to tenant (upsert)
        const { error: linkError } = await adminClient
            .from('user_tenants')
            .upsert({
                tenant_id: tenantId,
                user_id: targetUserId,
                role,
                role_id: appRole?.id || null,
                zone_id: zoneId,
                status: 'active'
            }, {
                onConflict: 'tenant_id,user_id'
            });

        if (linkError) {
            console.error('[API /team/members] linkError:', linkError.message);
            return NextResponse.json({ error: `Error vinculando: ${linkError.message}` }, { status: 500 });
        }

        // debug: [API /team/members] SUCCESS:', email, isNewUser ? 'NEW' : 'EXISTING');

        return NextResponse.json({
            success: true,
            message: isNewUser
                ? `Usuario ${email} creado y vinculado al equipo`
                : `${email} vinculado al equipo exitosamente`,
            isNewUser
        }, { status: 201 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[API /team/members] UNHANDLED:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // 2. Admin check
        const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('role, tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();

        const adminRoles = ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner'];
        if (!userTenant || !adminRoles.includes(userTenant.role)) {
            return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
        }

        // 3. Parse body
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
        }

        const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
        const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';

        if (!userId) {
            return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
        }

        // 4. Verify user belongs to same tenant
        const { data: targetMember } = await supabase
            .from('user_tenants')
            .select('id')
            .eq('user_id', userId)
            .eq('tenant_id', userTenant.tenant_id)
            .maybeSingle();

        if (!targetMember) {
            return NextResponse.json({ error: 'Usuario no pertenece a este equipo' }, { status: 404 });
        }

        // 5. Update password via admin client
        const adminClient = createAdminClient();
        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
            password: newPassword,
        });

        if (updateError) {
            console.error('[API /team/members PATCH] updateUser error:', updateError.message);
            return NextResponse.json({ error: translateAuthError(updateError.message) }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente' });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[API /team/members PATCH] UNHANDLED:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
