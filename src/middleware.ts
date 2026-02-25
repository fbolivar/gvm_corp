import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware V3: Session Refresh + Security Gate
 * 
 * Purpose for 100+ connections:
 * 1. Automatically refreshes Supabase JWT tokens before they expire
 *    → Prevents 401 storms when multiple users have stale tokens
 * 2. Protects /main routes without requiring each page to check auth
 *    → Reduces 1 DB call (getUser) per page load
 * 3. Runs at the Edge (Vercel) → sub-5ms latency, no cold starts
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

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

    // IMPORTANT: Do NOT call supabase.auth.getSession() — it doesn't refresh the token.
    // Always use getUser() which validates the JWT and refreshes if needed.
    const { data: { user } } = await supabase.auth.getUser()

    // Protect all /main routes — redirect to login if no session
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/')
        && !request.nextUrl.pathname.startsWith('/login')
        && !request.nextUrl.pathname.startsWith('/signup')
        && !request.nextUrl.pathname.startsWith('/portal')
        && !request.nextUrl.pathname.startsWith('/api')
        && !request.nextUrl.pathname.startsWith('/_next')
        && request.nextUrl.pathname !== '/favicon.ico'
        && request.nextUrl.pathname !== '/logo-gvm.png'

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If logged in user tries to access /login, redirect to dashboard
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
