"use server"

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;

    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
    const protocol = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const siteUrl = `${protocol}://${host}`;
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
        },
    });

    if (error) {
        return redirect("/login?message=" + encodeURIComponent(error.message));
    }

    return redirect("/login?message=Check email to continue sign in process");
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
