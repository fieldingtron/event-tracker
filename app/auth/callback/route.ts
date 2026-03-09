import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/'

    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
    const protocol = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;

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
