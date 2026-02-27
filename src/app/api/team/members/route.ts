import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener mínimo 8 caracteres').optional(),
    role: z.string().min(1, 'El rol es requerido'),
    zoneId: z.string().uuid().optional().nullable(),
    fullName: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        // 1. Verificar que el solicitante está autenticado y es admin
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Verificar que el usuario es admin
        const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('role, tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();

        const adminRoles = ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner'];
        if (!userTenant || !adminRoles.includes(userTenant.role)) {
            return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
        }

        // 2. Validar body
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email, password, role, zoneId, fullName } = parsed.data;
        const tenantId = userTenant.tenant_id;

        // 3. Buscar rol en app_roles para obtener role_id
        const { data: appRole } = await supabase
            .from('app_roles')
            .select('id')
            .eq('name', role)
            .maybeSingle();

        // 4. Usar Admin Client para operaciones privilegiadas
        const adminClient = createAdminClient();

        // Buscar si el usuario ya existe
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        let targetUserId: string;

        if (existingUser) {
            // Usuario ya existe → solo vincularlo
            targetUserId = existingUser.id;

            // Si vino contraseña, actualizarla
            if (password) {
                await adminClient.auth.admin.updateUserById(targetUserId, { password });
            }
        } else {
            // Usuario nuevo → crear con email + password
            if (!password) {
                return NextResponse.json(
                    { error: 'La contraseña es requerida para crear un usuario nuevo' },
                    { status: 400 }
                );
            }

            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirmar email (no requiere verificación)
                user_metadata: {
                    full_name: fullName || email.split('@')[0],
                    role
                }
            });

            if (createError) {
                return NextResponse.json({ error: createError.message }, { status: 400 });
            }

            if (!newUser.user) {
                return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 });
            }

            targetUserId = newUser.user.id;
        }

        // 5. Vincular usuario al tenant (upsert)
        const { error: linkError } = await adminClient
            .from('user_tenants')
            .upsert({
                tenant_id: tenantId,
                user_id: targetUserId,
                role,
                role_id: appRole?.id || null,
                zone_id: zoneId || null,
                status: 'active'
            }, {
                onConflict: 'tenant_id,user_id'
            });

        if (linkError) {
            return NextResponse.json({ error: linkError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: existingUser
                ? `${email} vinculado al equipo exitosamente`
                : `Usuario ${email} creado y vinculado al equipo`,
            isNewUser: !existingUser
        }, { status: 201 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[API /team/members] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
