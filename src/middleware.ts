import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware V4: Subdomain routing + Session Refresh + Security Gate
 *
 * Subdomain behavior:
 * - admin.bc-security.com  → only super admin panel accessible
 * - app.bc-security.com    → main app (all tenants)
 * - *.gvm.com.co           → tenant-specific (e.g. gvmcorp.gvm.com.co)
 * - any other host         → standard app
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const hostname = request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname
    const isAdminHost = hostname.startsWith('admin.bc-security.com')

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
        url.pathname = isAdminHost ? '/super-admin' : '/dashboard'
        return NextResponse.redirect(url)
    }

    // ─── admin.bc-security.com: restrict to super admin routes only ──────
    if (isAdminHost && user) {
        // Allow /super-admin, /login, /logout, API routes, static
        const allowedOnAdmin =
            pathname.startsWith('/super-admin')
            || pathname.startsWith('/login')
            || pathname.startsWith('/api')
            || pathname.startsWith('/_next')
            || pathname === '/favicon.ico'

        // Root of admin host → redirect to /super-admin
        if (pathname === '/' || pathname === '/dashboard') {
            const url = request.nextUrl.clone()
            url.pathname = '/super-admin'
            return NextResponse.redirect(url)
        }

        // Any other path on admin host → redirect to main app
        if (!allowedOnAdmin) {
            const url = new URL('https://app.bc-security.com' + pathname)
            return NextResponse.redirect(url)
        }
    }

    // ─── app.bc-security.com / other hosts: block /super-admin visible access ──
    // Note: the page itself already has auth check via is_platform_admin()

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)',
    ],
}
