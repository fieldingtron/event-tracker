import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/'

    const isProd = process.env.NODE_ENV === 'production';
    const origin = process.env.NEXT_PUBLIC_SITE_URL
        || (isProd ? "https://event-tracker-ashen.vercel.app" : "http://localhost:3000");

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
        return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(error.message)}`)
    } else if (token_hash && type) {
        const supabase = await createClient()
        const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
        })
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
        return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(error.message)}`)
    }

    // If there's an error or no code, redirect to the login page
    return NextResponse.redirect(`${origin}/login?message=Could not authenticate user from magic link. The link may have expired.`)
}
