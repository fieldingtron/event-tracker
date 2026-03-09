"use server"

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;

    const allowedEmails = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    if (allowedEmails.length > 0 && !allowedEmails.includes(email.toLowerCase())) {
        return redirect("/login?message=Unauthorized email address.");
    }


    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
            shouldCreateUser: false, // Prevents Supabase from making new accounts for random people
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
