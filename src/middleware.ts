import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware V5: Subdomain routing + Custom Domains + Session Refresh
 *
 * Host behavior:
 * - admin.bc-security.com   → only super admin panel
 * - app.bc-security.com     → multi-tenant app (choose tenant by login)
 * - {slug}.bc-security.com  → tenant-specific (slug resolved via DB)
 * - custom domain (e.g. gvmcorp.gvm.com.co) → tenant-specific
 * - any other host          → standard app
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const hostname = (request.headers.get('host') || '').toLowerCase().split(':')[0]
    const pathname = request.nextUrl.pathname
    const isAdminHost = hostname.startsWith('admin.bc-security.com')
    const isAppHost = hostname.startsWith('app.bc-security.com')
    const isVercelPreview = hostname.endsWith('.vercel.app')

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // ─── Resolve tenant context from hostname (for tenant-specific hosts) ────
    let tenantContext: { tenant_id: string; slug: string } | null = null
    if (!isAdminHost && !isAppHost && !isVercelPreview && !hostname.startsWith('localhost')) {
        // Try resolve tenant by custom domain or slug subdomain
        // Example: gvmcorp.gvm.com.co OR gvm.bc-security.com
        let lookupKey = hostname
        if (hostname.endsWith('.bc-security.com')) {
            lookupKey = hostname.replace('.bc-security.com', '')
        }

        const rpcResult = await supabase
            .rpc('get_tenant_by_domain', { p_domain: lookupKey })
            .maybeSingle<{ tenant_id: string; slug: string | null }>()

        if (rpcResult.data) {
            tenantContext = {
                tenant_id: rpcResult.data.tenant_id,
                slug: rpcResult.data.slug || '',
            }
            request.headers.set('x-tenant-id', tenantContext.tenant_id)
            request.headers.set('x-tenant-slug', tenantContext.slug)
        }
    }

    // ─── Public routes (no auth required) ────────────────────────────────
    const isPublic = pathname.startsWith('/login')
        || pathname.startsWith('/signup')
        || pathname.startsWith('/portal')
        || pathname.startsWith('/api')
        || pathname.startsWith('/_next')
        || pathname.startsWith('/pay/')
        || pathname.startsWith('/offline')
        || pathname.startsWith('/terminal/')
        || pathname === '/favicon.ico'
        || pathname === '/logo-gvm.png'
        || pathname === '/manifest.webmanifest'
        || pathname === '/sw.js'

    if (!user && !isPublic) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && (pathname === '/login' || pathname === '/signup')) {
        const url = request.nextUrl.clone()
        // Si es primer login con flag activo, entra directo al cambio obligatorio
        if (user.user_metadata?.must_change_password === true) {
            url.pathname = '/change-password'
        } else {
            url.pathname = isAdminHost ? '/super-admin' : '/dashboard'
        }
        return NextResponse.redirect(url)
    }

    // ─── Cambio de contraseña obligatorio en primer login ──────────────────
    // Mientras must_change_password sea true, bloqueamos todo excepto la propia
    // página /change-password y el signout.
    if (user && user.user_metadata?.must_change_password === true) {
        const isAllowed =
            pathname.startsWith('/change-password')
            || pathname.startsWith('/api')
            || pathname.startsWith('/_next')
            || pathname === '/favicon.ico'
            || pathname === '/logo-gvm.png'
            || pathname === '/manifest.webmanifest'
            || pathname === '/sw.js'

        if (!isAllowed) {
            const url = request.nextUrl.clone()
            url.pathname = '/change-password'
            return NextResponse.redirect(url)
        }
    }

    // ─── admin.bc-security.com: restrict to super admin routes only ──────
    if (isAdminHost && user) {
        const allowedOnAdmin =
            pathname.startsWith('/super-admin')
            || pathname.startsWith('/login')
            || pathname.startsWith('/api')
            || pathname.startsWith('/_next')
            || pathname === '/favicon.ico'

        if (pathname === '/' || pathname === '/dashboard') {
            const url = request.nextUrl.clone()
            url.pathname = '/super-admin'
            return NextResponse.redirect(url)
        }

        if (!allowedOnAdmin) {
            const url = new URL('https://app.bc-security.com' + pathname)
            return NextResponse.redirect(url)
        }
    }

    // ─── Tenant-specific host: block super admin access ──────────────────
    if (tenantContext && pathname.startsWith('/super-admin')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        // Excluye rutas que manejan su propia auth o son estáticas/públicas.
        // Esto evita un supabase.auth.getUser() innecesario por request en esas rutas.
        '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline|terminal|pay|portal|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico)$).*)',
    ],
}
